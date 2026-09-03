/**
 * Starting points for a new webinar.
 *
 * The first screen is currently five empty boxes, two of which — "topic" and
 * "what are you selling" — are read by the AI moderators, so a host who leaves
 * them thin gets a room that answers questions badly and never finds out why.
 *
 * A template is not a shortcut past that. It is a worked example of what those
 * fields are for, in the host's own domain, which they then edit. Teaching the
 * shape of the product is most of the value; the words are the rest.
 *
 * Deliberately not stored in the database. These are content, they change when
 * the product's advice changes, and a table would mean editing rows to fix a
 * sentence.
 */

export type WebinarTemplate = {
  id: string;
  name: string;
  /** Who this is for, in the host's words rather than ours. */
  audience: string;
  title: string;
  description: string;
  topic: string;
  offerDescription: string;
  webinarContext: string;
  /** Suggested runtime, shown so a host knows what they are committing to. */
  minutes: number;
  /** Where the offer usually lands, as a fraction of the runtime. */
  offerAt: number;
};

export const WEBINAR_TEMPLATES: WebinarTemplate[] = [
  {
    id: "blank",
    name: "Start from scratch",
    audience: "You already know what you are building.",
    title: "",
    description: "",
    topic: "",
    offerDescription: "",
    webinarContext: "",
    minutes: 45,
    offerAt: 0.7,
  },
  {
    id: "coaching",
    name: "Coaching or consulting",
    audience: "You sell your own time, and the webinar books calls.",
    title: "How to [outcome] in [timeframe] without [the thing they dread]",
    description:
      "A working session on the three decisions that separate the people who get [outcome] from the people who stall. Bring a notepad — you will leave with the first one made.",
    topic:
      "The three decisions behind [outcome], why the second one is where most people stall, and what to do instead.",
    offerDescription:
      "A paid diagnostic call. Not a sales call — they leave with a written plan whether or not they go on to work with me.",
    webinarContext:
      "Audience is mostly people who have tried this once already and did not finish. They are sceptical of anything that sounds like a shortcut, and they respond to being told what will be hard.",
    minutes: 45,
    offerAt: 0.72,
  },
  {
    id: "course",
    name: "Course or cohort launch",
    audience: "You are selling a programme with a start date.",
    title: "The [system name] method: [specific result], step by step",
    description:
      "I will walk through the whole method end to end, including the part everyone skips. Doors to the next cohort open at the end, and close on [date].",
    topic:
      "The full method, taught properly rather than teased. Deliberately gives away the what and charges for the how.",
    offerDescription:
      "A cohort-based course with a fixed start date, live calls and a community. Price is [amount]; there is a payment plan.",
    webinarContext:
      "Most of the room found me through [channel] and has been reading for a while. The objection is not price, it is whether they will actually finish.",
    minutes: 60,
    offerAt: 0.75,
  },
  {
    id: "saas",
    name: "Software demo",
    audience: "You are showing a product and want trials or demos.",
    title: "[Product] in 30 minutes: [the workflow it replaces]",
    description:
      "A real walkthrough with real data — no slides. I will build [specific thing] from scratch and answer whatever comes up in the chat.",
    topic:
      "A live build of [specific thing], covering setup, the two settings everyone gets wrong, and what it looks like after a month of use.",
    offerDescription:
      "A free trial with the onboarding call included, or an extended trial for anyone who attends live.",
    webinarContext:
      "The room is a mix of evaluators and people who already tried the free tier and bounced. Questions will be specific and technical; vague answers lose them.",
    minutes: 30,
    offerAt: 0.8,
  },
  {
    id: "physical",
    name: "Product or ecommerce",
    audience: "You sell a physical product and want orders.",
    title: "Why [product category] fails, and what we did differently",
    description:
      "The design decisions behind [product], why the obvious approach does not work, and a live look at the difference. Attendees get [offer] during the session.",
    topic:
      "How [product] is made, the trade-off nobody in the category talks about, and what to look for whether or not you buy from me.",
    offerDescription:
      "A bundle at [amount] with free shipping, available during the session and for 24 hours after.",
    webinarContext:
      "Audience is comparison-shopping. They have seen three competitors this week and cannot tell them apart, which is the actual problem to solve.",
    minutes: 35,
    offerAt: 0.68,
  },
  {
    id: "free-training",
    name: "Free training, list building",
    audience: "No offer yet — you want the audience first.",
    title: "[Number] things I wish I had known about [topic]",
    description:
      "A straight teaching session, no pitch. If it is useful, the next one is [date] and I will send the notes either way.",
    topic:
      "Practical, immediately usable material on [topic]. No offer at the end — the goal is that they come back.",
    offerDescription:
      "Nothing is being sold. The call to action is to join the list for the next session.",
    webinarContext:
      "Cold audience, mostly from [channel]. They do not know me and will leave the moment it feels like a pitch, so it must not become one.",
    minutes: 40,
    offerAt: 0.9,
  },
];

export function templateById(id: string): WebinarTemplate | undefined {
  return WEBINAR_TEMPLATES.find((template) => template.id === id);
}
