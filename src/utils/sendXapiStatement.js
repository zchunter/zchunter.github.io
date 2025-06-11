export async function sendXapiStatement({ 
  replacementsChecked = 0, 
  totalReplacements = 0, 
  tool = "xliff-swapper", 
  endpoint, 
  auth 
}) {
  const toolName = tool === "xliff-swapper"
    ? "XLIFF Swapper"
    : tool; // fallback if you expand later

  const statement = {
    actor: {
      name: "Anonymous User",
      mbox: "mailto:anon@zchunter.site"
    },
    verb: {
      id: "http://adlnet.gov/expapi/verbs/used",
      display: { "en-US": "used" }
    },
    object: {
      id: `https://zchunter.github.io/tools/${tool}`,
      definition: {
        name: { "en-US": toolName },
        description: { "en-US": `A tool used on zchunter.github.io to process data for ${tool}.` }
      },
      objectType: "Activity"
    },
    result: {
      extensions: {
        "https://zchunter.github.io/xapi/extensions/text-objects-checked": replacementsChecked,
        "https://zchunter.github.io/xapi/extensions/text-replacements-made": totalReplacements
      }
    },
    timestamp: new Date().toISOString()
  };

  const res = await fetch(`${endpoint}statements`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      "X-Experience-API-Version": "1.0.3"
    },
    body: JSON.stringify(statement)
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`xAPI send failed: ${res.status} ${errorText}`);
  }
}