"use client"

import { useState, useContext, createContext, useEffect } from "react";
import * as Realm from "realm-web";
import { Board } from "../typings/types";

interface RealmContextType {
  app: Realm.App | null;
  user: Realm.User | null;
  collection: globalThis.Realm.Services.MongoDB.MongoDBCollection<Board> | null;
  isLoading: boolean;
}

const RealmAppContext = createContext<RealmContextType>({
  app: null,
  user: null,
  collection: null,
  isLoading: true,
});

export function useRealmApp() {
  return useContext(RealmAppContext);
}

export function RealmAppProvider({ children }) {
  const [app, setApp] = useState<Realm.App | null>(null);
  const [user, setUser] = useState<Realm.User | null>(null);
  const [collection, setCollection] = useState<globalThis.Realm.Services.MongoDB.MongoDBCollection<Board> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
        console.log(process.env.NEXT_PUBLIC_MODE)

    const initRealm = async () => {
      const realmApp = new Realm.App({ id: "new-db-realm-sbrnzvh" });
      setApp(realmApp);

      try {
        const credentials = Realm.Credentials.anonymous();
        const loggedInUser = await realmApp.logIn(credentials);
        setUser(loggedInUser);


        const mongo = loggedInUser.mongoClient("mongodb-atlas");
        const userCollection = mongo.db("react-web-app").collection(process.env.NEXT_PUBLIC_MODE);
        setCollection(userCollection);
      } catch (err) {
        console.error("Failed to log in", err);
      } finally {
        setIsLoading(false);
      }
    };

    initRealm();
  }, []);

  const value = {
    app,
    user,
    collection,
    isLoading,
  };

  return (
    <RealmAppContext.Provider value={value}>
      {children}
    </RealmAppContext.Provider>
  );
}