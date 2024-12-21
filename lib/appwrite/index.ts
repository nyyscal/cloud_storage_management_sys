"use server";

import { ID, Query, Client, Account, Databases, Storage } from "node-appwrite";
import { appwriteConfig } from "./config";
import { cookies } from "next/headers";

export async function createSessionClient() {
  const session = (await cookies()).get("appwrite-session");

  // Log the session for debugging
  console.log("Session cookie:", session);

  if (!session || !session.value) {
    console.warn("Session not found or invalid. Redirecting to login.");
    throw new Error("No session found");
  }

  // Initialize the Appwrite client
  const client = new Client()
    .setEndpoint(appwriteConfig.endpointUrl)
    .setProject(appwriteConfig.projectId);

  client.setSession(session.value);

  return {
    get account() {
      return new Account(client);
    },
    get databases() {
      return new Databases(client);
    },
  };
}

export const createAdminClient = async () => {
  const client = new Client()
    .setEndpoint(appwriteConfig.endpointUrl)
    .setProject(appwriteConfig.projectId)
    .setKey(appwriteConfig.secretKey);

  return {
    get account() {
      return new Account(client);
    },
    get databases() {
      return new Databases(client);
    },
    get storage() {
      return new Storage(client);
    },
  };
};
