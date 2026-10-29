import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import { mongoClient, db } from "../../db";
import bcrypt from "bcryptjs";
import { authStorage } from "./storage";
import { User as SelectUser } from "@shared/models/auth";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

function getSessionCookieConfig(isProduction: boolean): session.CookieOptions {
  const frontends = process.env.FRONTEND_URL?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
  const hasExternalFrontend = isProduction && frontends.length > 0;

  return {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: hasExternalFrontend ? "none" : "lax",
    secure: hasExternalFrontend,
  };
}

export async function setupAuth(app: Express) {
  const sessionStore = MongoStore.create({
    clientPromise: Promise.resolve(mongoClient),
    dbName: db.databaseName,
    collectionName: "sessions",
    ttl: 7 * 24 * 60 * 60,
  });
  if (!process.env.SESSION_SECRET) throw new Error("Configure SESSION_SECRET no arquivo .env.");

  app.use(
    session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store: sessionStore,
      proxy: process.env.NODE_ENV === "production",
      cookie: getSessionCookieConfig(process.env.NODE_ENV === "production"),
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await authStorage.getUserByUsername(username);
        if (!user || !(await bcrypt.compare(password, user.password))) {
          return done(null, false, { message: "Usuário ou senha incorretos." });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: any, done) => {
    try {
      const user = await authStorage.getUser(Number(id));
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
}

export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).send("Unauthorized");
};
