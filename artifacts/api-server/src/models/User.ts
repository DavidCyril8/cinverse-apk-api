import mongoose, { type Document, Schema } from "mongoose";

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  displayName: string;
  avatarUrl: string;
  role: "member" | "vip";
  cinverseId: string;
  createdAt: Date;
  watchlist: Array<{
    movieId: string;
    title: string;
    poster: string;
    mediaType: "movie" | "series";
    addedAt: Date;
  }>;
  watchHistory: Array<{
    movieId: string;
    title: string;
    poster: string;
    mediaType: "movie" | "series";
    progressSeconds: number;
    durationSeconds: number;
    watchedAt: Date;
    season?: number;
    episode?: number;
  }>;
  searchHistory: string[];
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    displayName: { type: String, required: true, trim: true },
    avatarUrl: { type: String, default: "" },
    role: { type: String, enum: ["member", "vip"], default: "member" },
    cinverseId: { type: String, unique: true, sparse: true },
    watchlist: [
      {
        movieId: String,
        title: String,
        poster: String,
        mediaType: { type: String, enum: ["movie", "series"], default: "movie" },
        addedAt: { type: Date, default: Date.now },
      },
    ],
    watchHistory: [
      {
        movieId: String,
        title: String,
        poster: String,
        mediaType: { type: String, enum: ["movie", "series"], default: "movie" },
        progressSeconds: { type: Number, default: 0 },
        durationSeconds: { type: Number, default: 0 },
        watchedAt: { type: Date, default: Date.now },
        season: Number,
        episode: Number,
      },
    ],
    searchHistory: [String],
  },
  { timestamps: true },
);

export const User = mongoose.model<IUser>("User", userSchema);
