import type { Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import { authCookieName, authCookieOptions } from "../../config/cookies.js";
import { AppError } from "../../lib/AppError.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import {
  createSocketToken,
  getUserById,
  loginUser,
  registerUser,
} from "./auth.service.js";
import type { LoginInput, RegisterInput } from "./auth.validators.js";

export const register = asyncHandler<RegisterInput>(
  async (
    req: Request<ParamsDictionary, unknown, RegisterInput>,
    res: Response,
  ) => {
    const { user, token } = await registerUser(req.body);

    res.cookie(authCookieName, token, authCookieOptions);
    res.status(201).json({
      success: true,
      data: user,
      message: "Account created successfully",
    });
  },
);

export const login = asyncHandler<LoginInput>(
  async (
    req: Request<ParamsDictionary, unknown, LoginInput>,
    res: Response,
  ) => {
    const { user, token } = await loginUser(req.body);

    res.cookie(authCookieName, token, authCookieOptions);
    res.status(200).json({
      success: true,
      data: user,
      message: "Logged in successfully",
    });
  },
);

export const logout = (_req: Request, res: Response): void => {
  const { maxAge: _maxAge, ...clearOptions } = authCookieOptions;
  res.clearCookie(authCookieName, clearOptions);
  res.status(204).end();
};

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  if (req.user === undefined) {
    throw new AppError("Authentication is required", 401, "UNAUTHORIZED");
  }

  const user = await getUserById(req.user.id);

  res.status(200).json({ success: true, data: user });
});

export const getSocketToken = asyncHandler(
  async (req: Request, res: Response) => {
    if (req.user === undefined) {
      throw new AppError("Authentication is required", 401, "UNAUTHORIZED");
    }

    res.status(200).json({
      success: true,
      data: { token: createSocketToken(req.user.id) },
    });
  },
);
