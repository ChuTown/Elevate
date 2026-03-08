import axios from "axios";
import { apiBaseUrl } from "../config";

export const api = axios.create({
  baseURL: apiBaseUrl || undefined,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export interface ApiUser {
  _id: string;
  email: string;
  name: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    profilePhotoUrl?: string;
    professionalTitle?: string;
    [key: string]: unknown;
  };
  clientProfile?: {
    firstName?: string;
    lastName?: string;
    profilePhotoUrl?: string;
    resumeUrl?: string;
    description?: string;
    [key: string]: unknown;
  };
}
