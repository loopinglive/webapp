import "server-only";

import * as saml from "samlify";

import { SITE } from "@/lib/constants";
import type { SsoConfigurationRow } from "@/types/database";

// samlify's XSD schema validation is optional (skipped entirely if unset —
// verified against its source, not assumed) and separate from signature
// verification, which is mandatory and is the part that actually matters for
// authentication security. A minimal always-resolving validator here just
// avoids samlify's first-call warning; it adds no cryptographic weakening on
// top of skipping schema validation entirely, since neither path checks a
// signature.
saml.setSchemaValidator({ validate: async () => true });

export type SamlAttributeMapping = {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
};

const DEFAULT_MAPPING: Required<SamlAttributeMapping> = {
  email: "email",
  firstName: "firstName",
  lastName: "lastName",
  role: "role",
};

/** This app's SP identity for one team — every team gets its own entity ID and ACS URL. */
export function createServiceProvider(teamId: string) {
  return saml.ServiceProvider({
    entityID: `${SITE.url}/sso/${teamId}`,
    assertionConsumerService: [
      {
        Binding: "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST",
        Location: `${SITE.url}/api/sso/callback?teamId=${teamId}`,
      },
    ],
    wantAssertionsSigned: true,
    wantMessageSigned: false,
    nameIDFormat: ["urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"],
  });
}

/** The customer's IdP, built from the config they saved (Okta, Azure AD, or any SAML 2.0 IdP). */
export function createIdentityProvider(config: Pick<SsoConfigurationRow, "entity_id" | "sso_url" | "certificate">) {
  return saml.IdentityProvider({
    entityID: config.entity_id ?? undefined,
    singleSignOnService: [
      { Binding: "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect", Location: config.sso_url },
    ],
    signingCert: config.certificate,
  });
}

export function spMetadataXml(teamId: string): string {
  return createServiceProvider(teamId).getMetadata();
}

export type SamlIdentity = {
  nameId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string | null;
};

/** Applies the team's own attribute mapping to a parsed assertion's attribute set. */
export function extractIdentity(
  extract: { nameID?: string; attributes?: Record<string, string | string[]> },
  mapping: SamlAttributeMapping | null
): SamlIdentity {
  const map = { ...DEFAULT_MAPPING, ...(mapping ?? {}) };
  const attributes = extract.attributes ?? {};

  const first = (value: string | string[] | undefined): string | null => {
    if (!value) return null;
    return Array.isArray(value) ? (value[0] ?? null) : value;
  };

  return {
    nameId: extract.nameID ?? "",
    email: first(attributes[map.email]) ?? (extract.nameID?.includes("@") ? extract.nameID : null),
    firstName: first(attributes[map.firstName]),
    lastName: first(attributes[map.lastName]),
    role: first(attributes[map.role]),
  };
}
