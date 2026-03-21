export type RecordCookEventActionState =
  | { status: "idle" }
  | { status: "success"; cookEventId: number }
  | { status: "error"; message: string; httpStatus?: number }

export type DeleteCookEventActionState =
  | { status: "idle" }
  | { status: "error"; message: string; httpStatus?: number }
