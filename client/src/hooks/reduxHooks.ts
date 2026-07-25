/**
 * Typed wrappers around useDispatch/useSelector so every call site gets
 * AppDispatch/RootState typing for free instead of importing and casting
 * them individually everywhere.
 */
import { useDispatch, useSelector, type TypedUseSelectorHook } from "react-redux";
import type { AppDispatch, RootState } from "../store";

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
