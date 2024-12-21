"use server";
import { UploadFileProps } from "@/types";
import { createAdminClient, createSessionClient } from "../appwrite";
import { appwriteConfig } from "../appwrite/config";
import { constructFileUrl, getFileType, parseStringify } from "../utils";
import { revalidatePath } from "next/cache";
import { ID, Models, Query } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { getCurrentUser } from "./user.action";

const handleError = (error: unknown, message: string) => {
  console.error(message, error);
  throw error;
};

const createQuery =(currentUser:Models.Document,types:string[],searchText:string,sort:string,limit?:number)=>{
  const querires =[
    Query.or([
      Query.equal("owner",[currentUser.$id]),
      Query.contains("users",[currentUser.email]),
    ]),
  ]
  //Todo:
  if(types.length>0) querires.push(Query.equal("type",types))
  if(searchText) querires.push(Query.contains("name",searchText))
  if(limit) querires.push(Query.limit(limit))
    if(sort){

      const [sortBy, orderBy] = sort.split("-")
  
      querires.push(orderBy === "asc" ? Query.orderAsc(sortBy): Query.orderDesc(sortBy))
    }
  return querires
}
export const uploadFile = async ({
  file,
  ownerId,
  accountId,
  path,
}: UploadFileProps) => {
  const { storage, databases } = await createAdminClient();

  // Validate file
  if (!file || file.size === 0) {
    throw new Error("File is empty or invalid.");
  }
  // console.log("File details:", file);

  try {
    // Convert file to buffer and handle
    const buffer = await file.arrayBuffer();
    const inputFile = InputFile.fromBuffer(buffer, file.name);
    const bucketFile = await storage.createFile(
      appwriteConfig.bucketId,
      ID.unique(),
      inputFile
    );

    // Prepare the document object
    const fileDocument = {
      type: getFileType(bucketFile.name).type, // Ensure this field is in the schema
      name: bucketFile.name, // Ensure this field is in the schema
      url: constructFileUrl(bucketFile.$id), // Ensure this field is in the schema
      extension: getFileType(bucketFile.name).extension, // Ensure this field is in the schema
      size: bucketFile.sizeOriginal, // Ensure this field is in the schema
      owner: ownerId, // Ensure this field is in the schema
      accountId, // Ensure this field is in the schema
      users: [], // Ensure this field is in the schema
      bucketFileId: bucketFile.$id, // Ensure this field is in the schema
    };

    // Insert the document into the database
    const newFile = await databases
      .createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.filesCollectionId,
        ID.unique(),
        fileDocument
      )
      .catch(async (error: unknown) => {
        await storage.deleteFile(appwriteConfig.bucketId, bucketFile.$id);
        handleError(error, "Failed to create file document");
      });

    revalidatePath(path);
    return parseStringify(newFile);
  } catch (error) {
    handleError(error, "Failed to upload files");
  }
};

export const getFiles = async({types =[],searchText="",sort="$createdAt-desc",limit}:GetFilesProps)=>{
  const {databases}= await createAdminClient()

  try {
    const currentUser = await getCurrentUser()
    if(!currentUser) throw new Error("User not found")

      const queries = createQuery(currentUser, types,searchText,sort,limit)
      // console.log({currentUser,queries})
      const files = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.filesCollectionId,
        queries,
      )
      // console.log({files})
      return parseStringify(files)
  } catch (error) {
    handleError(error, "Failed to get files.")
  }
}

export const renameFile = async({fileId,name,extension,path}:RenameFileProps)=>{
  const {databases} = await createAdminClient()
  try{
    const newName = `${name}.${extension}`
    const updatedFile = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      fileId,
      {name:newName}
    );
    revalidatePath(path)
    return parseStringify(updatedFile)
  }catch(error){
    handleError(error,"Failed to rename file")
  }
}
export const updateFileUsers = async({fileId,emails,path}:UpdateFileUsersProps)=>{
  const {databases} = await createAdminClient()
  try{
    const updatedFile = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      fileId,
      {users:emails,}
    );
    revalidatePath(path)
    return parseStringify(updatedFile)
  }catch(error){
    handleError(error,"Failed to rename file")
  }
}
export const deleteFile = async({fileId,bucketFileId,path}:DeleteFileProps)=>{
  const {storage,databases} = await createAdminClient()
  try{
    const deletedFile = await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      fileId,
    );
    if(deletedFile) {
      await storage.deleteFile(appwriteConfig.bucketId, bucketFileId)
    }
    revalidatePath(path)
    return parseStringify({status: "success"})
  }catch(error){
    handleError(error,"Failed to rename file")
  }
}
export async function getTotalSpaceUsed() {
  try {
    const { databases } = await createSessionClient();
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("User is not authenticated.");

    const files = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      [Query.equal("owner", [currentUser.$id])],
    );

    const totalSpace = {
      image: { size: 0, latestDate: "" },
      document: { size: 0, latestDate: "" },
      video: { size: 0, latestDate: "" },
      audio: { size: 0, latestDate: "" },
      other: { size: 0, latestDate: "" },
      used: 0,
      all: 2 * 1024 * 1024 * 1024 /* 2GB available bucket storage */,
    };

    files.documents.forEach((file) => {
      const fileType = file.type as FileType;
      totalSpace[fileType].size += file.size;
      totalSpace.used += file.size;

      if (
        !totalSpace[fileType].latestDate ||
        new Date(file.$updatedAt) > new Date(totalSpace[fileType].latestDate)
      ) {
        totalSpace[fileType].latestDate = file.$updatedAt;
      }
    });

    return parseStringify(totalSpace);
  } catch (error) {
    handleError(error, "Error calculating total space used:, ");
  }
}
