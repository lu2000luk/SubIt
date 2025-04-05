import { Groq } from "groq-sdk";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key) {
        return new Response("Missing API key", { status: 400 });
    }

    const groq = new Groq({ apiKey: key });

    try {
        const models = await groq.models.list();
        return new Response(JSON.stringify(models), { status: 200 });
    } catch (error) {
        return new Response("Invalid API key", { status: 401 });
    }
}