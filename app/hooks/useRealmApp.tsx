"use client"

// src/hooks/useRealmApp.js
import { useState, useContext, createContext, useEffect } from "react";
import * as Realm from "realm-web";
import { Board } from "../typings/types";

const RealmAppContext = createContext<{
  app: Realm.App;
  user: Realm.User;
  collection: globalThis.Realm.Services.MongoDB.MongoDBCollection<Board>;
}>(null);

export function useRealmApp() {
  return useContext(RealmAppContext);
}

export function RealmAppProvider({ children }) {
  const [app] = useState(new Realm.App({ id: "new-db-realm-sbrnzvh" }));
  const [user, setUser] = useState<Realm.User>();
  const [collection, setCollection] =
    useState<globalThis.Realm.Services.MongoDB.MongoDBCollection<Board>>();

  useEffect(() => {
    const logIn = async () => {
      if (!app.currentUser) {
        const credentials = Realm.Credentials.anonymous();
        try {
          const loggedInUser = await app.logIn(credentials);
          setUser(loggedInUser);
          const mongo = loggedInUser.mongoClient("mongodb-atlas");
          const userCollection = mongo
            .db("react-web-app")
            .collection("development");
          setCollection(userCollection);
        } catch (err) {
          console.error("Failed to log in", err);
        }
      } else {
        setUser(app.currentUser);
        const mongo = app.currentUser.mongoClient("mongodb-atlas");
        const userCollection = mongo
          .db("react-web-app")
          .collection("development");
        setCollection(userCollection);
      }
    };

    logIn();
  }, [app]);

  const value = {
    app,
    user,
    collection,
  };

  return (
    <RealmAppContext.Provider value={value}>
      {children}
    </RealmAppContext.Provider>
  );
}
