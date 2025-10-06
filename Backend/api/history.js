import { CosmosClient } from "@azure/cosmos";

const cosmosClient = new CosmosClient(process.env.COSMOSDB_CONNECTION_STRING);
const database = cosmosClient.database("LibraChatDB");
const container = database.container("Conversations");

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required." });
    }

    const querySpec = {
      query: "SELECT c.id, c.title, c.createdAt FROM c WHERE c.userId = @userId ORDER BY c.createdAt DESC",
      parameters: [{ name: "@userId", value: userId }]
    };

    const { resources: conversations } = await container.items
      .query(querySpec)
      .fetchAll();

    return res.status(200).json(conversations);
  } catch (error) {
    console.error("Error in history function:", error);
    return res.status(500).json({ error: "Error fetching conversation history." });
  }
}
