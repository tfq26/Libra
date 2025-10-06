import axios from "axios";
import { CosmosClient } from "@azure/cosmos";
import { v4 as uuidv4 } from "uuid";

const cosmosClient = new CosmosClient(process.env.COSMOSDB_CONNECTION_STRING);
const database = cosmosClient.database("LibraChatDB");
const container = database.container("Conversations");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId, conversationId, message } = req.body;
    if (!userId || !message) {
      return res.status(400).json({ error: "userId and message are required" });
    }

    // Create new conversation if none exists
    let convoId = conversationId;
    if (!convoId) {
      convoId = uuidv4();
      await container.items.create({
        id: convoId,
        userId,
        title: message.substring(0, 30),
        createdAt: new Date().toISOString(),
        messages: []
      });
    }

    // Send to OpenAI (replace with your Azure OpenAI endpoint)
    const response = await axios.post(
      process.env.OPENAI_ENDPOINT,
      {
        model: "gpt-4o-mini",
        messages: [
          { role: "user", content: message }
        ]
      },
      {
        headers: {
          "Content-Type": "application/json",
          "api-key": process.env.OPENAI_KEY
        }
      }
    );

    const reply = response.data?.choices?.[0]?.message?.content || "No reply";

    // Save message & reply to CosmosDB
    const { resource } = await container.item(convoId, userId).read();
    resource.messages.push(
      { role: "user", content: message, createdAt: new Date().toISOString() },
      { role: "assistant", content: reply, createdAt: new Date().toISOString() }
    );
    await container.items.upsert(resource);

    return res.status(200).json({ conversationId: convoId, reply });
  } catch (error) {
    console.error("Error in chat function:", error?.response?.data || error.message);
    return res.status(500).json({ error: "Error processing chat" });
  }
}
