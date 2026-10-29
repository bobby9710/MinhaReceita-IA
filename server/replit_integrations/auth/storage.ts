import type { User, UpsertUser } from "../../../shared/models/auth";
import { db, nextId } from "../../db";

const users = db.collection<User>("users");
const projection = { _id: 0 };

export const authStorage = {
  async getUser(id: number) { return await users.findOne({ id }, { projection }) ?? undefined; },
  async getUserByUsername(username: string) { return await users.findOne({ username }, { projection }) ?? undefined; },
  async getUserByEmail(email: string) { return await users.findOne({ email }, { projection }) ?? undefined; },
  async createUser(data: UpsertUser): Promise<User> {
    const user = { ...data, id: await nextId("users"), createdAt: new Date(), updatedAt: new Date() };
    await users.insertOne({ ...user });
    return user;
  },
};

export type IAuthStorage = typeof authStorage;
