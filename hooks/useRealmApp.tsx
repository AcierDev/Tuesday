"use client"

import { useState, useContext, createContext, useEffect } from "react";
import * as Realm from "realm-web";
import { Board, Records } from "../typings/types";
import { CuttingData } from "@/typings/interfaces";

interface RealmContextType {
  app: Realm.App | null;
  user: Realm.User | null;
  boardCollection: globalThis.Realm.Services.MongoDB.MongoDBCollection<Board> | null;
  cuttingHistoryCollection: globalThis.Realm.Services.MongoDB.MongoDBCollection<CuttingData> | null;
  isLoading: boolean;
}

const RealmAppContext = createContext<RealmContextType>({
  app: null,
  user: null,
  boardCollection: null,
  cuttingHistoryCollection: null,
  isLoading: true,
});

export function useRealmApp() {
  return useContext(RealmAppContext);
}

export function RealmAppProvider({ children }) {
  const [app, setApp] = useState<Realm.App | null>(null);
  const [user, setUser] = useState<Realm.User | null>(null);
  const [boardCollection, setBoardCollection] = useState<globalThis.Realm.Services.MongoDB.MongoDBCollection<Board> | null>(null);
  const [cuttingHistoryCollection, setCuttingHistoryCollection] = useState<globalThis.Realm.Services.MongoDB.MongoDBCollection<Records> | null>(null);
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
        const userCollection = mongo.db("react-web-app").collection(process.env.NEXT_PUBLIC_MODE!);
        setBoardCollection(userCollection);
        const cuttingHistoryCollection = mongo.db("react-web-app").collection("cuttingHistory-" + process.env.NEXT_PUBLIC_MODE);
        setCuttingHistoryCollection(cuttingHistoryCollection);
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
    boardCollection,
    cuttingHistoryCollection,
    isLoading,
  };

  return (
    <RealmAppContext.Provider value={value}>
      {children}
    </RealmAppContext.Provider>
  );
}