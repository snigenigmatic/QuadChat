import { useState } from "react";

let user = null;

export const useAuthStore = () => {
  const [currentUser, setCurrentUser] = useState(user);

  const login = (userData) => setCurrentUser(userData);
  const logout = () => setCurrentUser(null);

  return { currentUser, login, logout };
};
