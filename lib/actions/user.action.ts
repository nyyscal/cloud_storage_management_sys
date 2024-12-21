"use server";

import { ID, Query, Client, Account, Databases } from "node-appwrite";
import { appwriteConfig } from "../appwrite/config";
import { parseStringify } from "../utils";
import { cookies } from "next/headers";
import { avatarPlaceholderUrl } from "@/constants";
import { redirect } from "next/navigation";
import { parse } from "path";

const initializeClient = () => {
  const client = new Client();
  client.setEndpoint(appwriteConfig.endpointUrl).setProject(appwriteConfig.projectId);
  return client;
};

export const createAdminClient = async () => {
  const client = initializeClient();
  client.setKey(appwriteConfig.secretKey);
  return {
    get account() {
      return new Account(client);
    },
    get databases() {
      return new Databases(client);
    },
  };
};

const getUserByEmail = async (email:String) => {
  const { databases } = await createAdminClient();
  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.usersCollectionId,
    [Query.equal("email", [email])]
  );

  return result.total > 0 ? result.documents[0] : null;
};

const handleError = (error:any, message:string) => {
  console.error(error, message);
  throw error;
};

export const sendEmailOTP = async ({ email }:{email:string}) => {
  const { account } = await createAdminClient();
  try {
    const session = await account.createEmailToken(ID.unique(), email);
    return session.userId;
  } catch (error) {
    handleError(error, "Failed to send email OTP!");
  }
};

export const createAccount = async ({ fullName, email }:{ fullName:string, email:string }) => {
  const existingUser = await getUserByEmail(email);

  const accountId = await sendEmailOTP({ email });
  if (!accountId) throw new Error("Failed to send an OTP!");
  if (!existingUser) {
    const { databases } = await createAdminClient();

    await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      ID.unique(),
      {
        fullName,
        email,
        avatar: avatarPlaceholderUrl,
        accountId,
      }
    );
  }

  return parseStringify({ accountId });
};

export const verifySecret = async ({ accountId, password }:{ accountId:string, password:string }) => {
  try {
    const { account } = await createAdminClient();
    const session = await account.createSession(accountId, password);
    (await cookies()).set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    });
    return parseStringify({ sessionId: session.$id });
  } catch (error) {
    handleError(error, "Failed to verify OTP!");
  }
};

export const getCurrentUser = async () => {
  const { databases, account } = await createSessionClient();

  const result = await account.get();
  const user = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.usersCollectionId,
    [Query.equal("accountId", result.$id)]
  );
  if (user.total <= 0) return null;

  return parseStringify(user.documents[0]);
};

export const signOutUser = async () => {
  const { account } = await createSessionClient();
  try {
    await account.deleteSession("current");
    (await cookies()).delete("appwrite-session");
  } catch (error) {
    handleError(error, "Failed to sign out user");
  } finally {
    redirect("/sign-in");
  }
};

export async function createSessionClient() {
  const session = (await cookies()).get("appwrite-session");

  if (!session || !session.value) {
    console.warn("Session not found or invalid. Redirecting to login.");
    throw new Error("No session found");
  }

  const client = initializeClient();
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

export const signInUser = async({email}:{email:string})=>{
  try {
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
    const accountId = existingUser.accountId;
      await sendEmailOTP({ email }); // Sends OTP if user is found
      return parseStringify({ accountId }); // Return accountId properly
    }
    return parseStringify({accountId:null,error:"User not found!"})
  } catch (error) {
    handleError(error,"Failed to sign-in user.")
    return parseStringify({account:null, error:"Error duirng sign-in."})
  }
}
