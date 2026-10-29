import { db, nextId, mongoClient } from "../../db";
import type { Conversation, Message } from "../../../shared/models/chat";
const conversations = db.collection<Conversation>("conversations");
const messages = db.collection<Message>("messages");
const projection = { _id: 0 };
export const chatStorage = {
 async getConversation(id: number) { return await conversations.findOne({ id }, { projection }) ?? undefined; },
 async getAllConversations() { return conversations.find({}, { projection }).sort({ createdAt: -1 }).toArray(); },
 async createConversation(title: string) {
  const item = { id: await nextId("conversations"), title, createdAt: new Date() };
  await conversations.insertOne({ ...item }); return item;
 },
 async deleteConversation(id: number) {
  const session = mongoClient.startSession();
  try { await session.withTransaction(async () => {
   await messages.deleteMany({ conversationId: id }, { session });
   await conversations.deleteOne({ id }, { session });
  }); } finally { await session.endSession(); }
 },
 async getMessagesByConversation(conversationId: number) { return messages.find({ conversationId }, { projection }).sort({ createdAt: 1 }).toArray(); },
 async createMessage(conversationId: number, role: string, content: string) {
  const item = { id: await nextId("messages"), conversationId, role, content, createdAt: new Date() };
  await messages.insertOne({ ...item }); return item;
 },
};
export type IChatStorage = typeof chatStorage;
