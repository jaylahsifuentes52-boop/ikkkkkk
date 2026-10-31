export default async (request) => {
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is missing from Netlify.");
    }

    const body = await request.json();
    const message = body.message || "";
    const mode = body.mode || "chat";

    if (!message.trim()) {
      throw new Error("Please enter a message.");
    }

    const instructions =
      mode === "fix"
        ? "You are Junior AI, an expert coding assistant. Find bugs in the user's code and return corrected, working code. Explain the important fixes."
        : "You are Junior AI, a helpful, friendly AI assistant. Answer clearly and help with coding and general questions.";

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
          instructions,
          input: message
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error?.message || "OpenAI request failed."
      );
    }

    const reply =
      result.output_text ||
      "Sorry, I couldn't generate a response.";

    return new Response(
      JSON.stringify({ reply }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};
