const fs = require("fs");
const { Client } = require("pg");

function env(name) {
  const line = fs
    .readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith(name + "="));
  return line ? line.slice(name.length + 1) : "";
}

const APP = "https://webapp-loopinglivecom-5602.vercel.app";
const SECRET = env("CRON_SECRET");
const W = "bdc141ac-09ec-4dd6-9e77-b8c58df23076";

const db = new Client({
  host: "aws-0-eu-central-1.pooler.supabase.com",
  port: 5432,
  user: "postgres.hgwmclknomprixcblhsw",
  password: process.env.DBPASS,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});

(async () => {
  await db.connect();

  // Point the database at the deployed endpoints.
  await db.query(
    `alter database postgres set app.automation_url = '${APP}/api/automation/cron'`
  );
  await db.query(
    `alter database postgres set app.trigger_url = '${APP}/api/automation/trigger'`
  );
  await db.query(`alter database postgres set app.cron_secret = '${SECRET}'`);
  console.log("1. database settings written");

  const jobs = await db.query(
    "select jobname, schedule, active from cron.job order by jobname"
  );
  console.log("\n2. scheduled jobs:");
  for (const j of jobs.rows) {
    console.log(`   ${j.jobname.padEnd(30)} ${j.schedule.padEnd(12)} active=${j.active}`);
  }

  // Seed the templates for the demo webinar.
  const seeded = await fetch(
    `${APP}/api/automation/cron`,
    { headers: { Authorization: `Bearer ${SECRET}` } }
  ).then((r) => r.json());
  console.log("\n3. dispatcher reachable with secret:", JSON.stringify(seeded));

  const denied = await fetch(`${APP}/api/automation/cron`).then((r) => r.status);
  console.log("   without secret:", denied, "(401 = correct)");

  const tmpl = await db.query(
    "select count(*)::int n, count(distinct template_key)::int keys from message_templates where webinar_id = $1",
    [W]
  );
  console.log("\n4. templates seeded:", JSON.stringify(tmpl.rows[0]));

  await db.end();
})();
