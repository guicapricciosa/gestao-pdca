declare const brand: unique symbol;

export type Brand<Value, Name extends string> = Value & {
  readonly [brand]: Name;
};

export type ProfileId = Brand<string, "ProfileId">;
export type CompanyId = Brand<string, "CompanyId">;
export type OrganizationalUnitId = Brand<string, "OrganizationalUnitId">;
export type RestaurantId = Brand<string, "RestaurantId">;
export type OrganizationalAssignmentId = Brand<
  string,
  "OrganizationalAssignmentId"
>;
export type SecurityObjectId = Brand<string, "SecurityObjectId">;
export type DecisionId = Brand<string, "DecisionId">;
export type TaskId = Brand<string, "TaskId">;
export type PdcaId = Brand<string, "PdcaId">;
export type CommentId = Brand<string, "CommentId">;
export type AttachmentId = Brand<string, "AttachmentId">;
