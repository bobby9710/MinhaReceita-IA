import { z } from "zod";
export const insertConversationSchema = z.object({ title: z.string().min(1) });
export const insertMessageSchema = z.object({ conversationId: z.number().int().positive(), role: z.string(), content: z.string() });
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Conversation = InsertConversation & { id: number; createdAt: Date };
export type Message = InsertMessage & { id: number; createdAt: Date };
