import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type {
  CompanyId,
  OrganizationalAssignmentId,
  OrganizationalUnitId,
  ProfileId,
  RestaurantId,
} from "@/shared/types/branded";
import type { Database } from "@/platform/supabase/database.types";

import { OrganizationValidationError } from "../application/errors";
import type { OrganizationRepository } from "../application/repository";
import type {
  Company,
  HierarchyRelationship,
  OrganizationalAssignment,
  OrganizationalUnit,
  Profile,
  Restaurant,
  RestaurantAssignment,
} from "../domain/types";
import type {
  CreateAssignmentInput,
  CreateCompanyInput,
  CreateHierarchyRelationshipInput,
  CreateOrganizationalUnitInput,
  CreateProfileInput,
  CreateRestaurantAssignmentInput,
  CreateRestaurantInput,
} from "../domain/validation";

const uuid = z.string();
const companyRow = z.object({
  id: uuid,
  code: z.string(),
  name: z.string(),
  legal_name: z.string().nullable(),
  timezone: z.string(),
  is_active: z.boolean(),
});
const unitRow = z.object({
  id: uuid,
  company_id: uuid,
  unit_type: z.enum(["DEPARTMENT", "SHARED_SERVICE"]),
  code: z.string(),
  name: z.string(),
  is_active: z.boolean(),
});
const restaurantRow = z.object({
  id: uuid,
  company_id: uuid,
  code: z.string(),
  name: z.string(),
  timezone: z.string(),
  is_active: z.boolean(),
});
const profileRow = z.object({
  id: uuid,
  auth_user_id: uuid,
  display_name: z.string(),
  email_snapshot: z.string(),
  is_active: z.boolean(),
});
const assignmentRow = z.object({
  id: uuid,
  profile_id: uuid,
  company_id: uuid,
  organizational_unit_id: uuid.nullable(),
  role_id: uuid,
  title: z.string().nullable(),
  unit_scope_mode: z.enum(["ASSIGNED", "COMPANY_WIDE"]),
  restaurant_scope_mode: z.enum([
    "NONE",
    "ASSIGNED",
    "INHERITED",
    "COMPANY_WIDE",
  ]),
  valid_from: z.string(),
  valid_to: z.string().nullable(),
  is_active: z.boolean(),
});
const hierarchyRow = z.object({
  id: uuid,
  parent_assignment_id: uuid,
  child_assignment_id: uuid,
  relationship_type: z.enum(["REPORTS_TO", "OPERATIONAL_RESPONSIBILITY"]),
  valid_from: z.string(),
  valid_to: z.string().nullable(),
  is_active: z.boolean(),
});
const restaurantAssignmentRow = z.object({
  id: uuid,
  organizational_assignment_id: uuid,
  restaurant_id: uuid,
  responsibility_type: z.enum(["PRIMARY", "SECONDARY", "COVERAGE"]),
  valid_from: z.string(),
  valid_to: z.string().nullable(),
  is_active: z.boolean(),
});

function fail(error: { message: string } | null): never {
  throw new OrganizationValidationError(
    error?.message ?? "Unexpected database response.",
  );
}

export class SupabaseOrganizationRepository implements OrganizationRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async createCompany(input: CreateCompanyInput): Promise<Company> {
    const response = await this.client
      .from("companies")
      .insert({
        code: input.code,
        name: input.name,
        legal_name: input.legalName ?? null,
        timezone: input.timezone ?? "Europe/Lisbon",
      })
      .select("id, code, name, legal_name, timezone, is_active")
      .single();
    if (response.error !== null) fail(response.error);
    const row = companyRow.parse(response.data);
    return {
      id: row.id as CompanyId,
      code: row.code,
      name: row.name,
      legalName: row.legal_name,
      timezone: row.timezone,
      isActive: row.is_active,
    };
  }

  async createOrganizationalUnit(
    input: CreateOrganizationalUnitInput,
  ): Promise<OrganizationalUnit> {
    const response = await this.client.rpc("create_organizational_unit", {
      target_company_id: input.companyId,
      target_unit_type: input.type,
      target_code: input.code,
      target_name: input.name,
    });
    if (response.error !== null) fail(response.error);
    const row = unitRow.parse(response.data);
    return this.mapUnit(row);
  }

  async createRestaurant(input: CreateRestaurantInput): Promise<Restaurant> {
    const response = await this.client
      .from("restaurants")
      .insert({
        company_id: input.companyId,
        code: input.code,
        name: input.name,
        timezone: input.timezone ?? "Europe/Lisbon",
      })
      .select("id, company_id, code, name, timezone, is_active")
      .single();
    if (response.error !== null) fail(response.error);
    return this.mapRestaurant(restaurantRow.parse(response.data));
  }

  async createProfile(input: CreateProfileInput): Promise<Profile> {
    const response = await this.client
      .from("profiles")
      .insert({
        auth_user_id: input.authUserId,
        display_name: input.displayName,
        email_snapshot: input.email.toLowerCase(),
      })
      .select("id, auth_user_id, display_name, email_snapshot, is_active")
      .single();
    if (response.error !== null) fail(response.error);
    const row = profileRow.parse(response.data);
    return {
      id: row.id as ProfileId,
      authUserId: row.auth_user_id,
      displayName: row.display_name,
      email: row.email_snapshot,
      isActive: row.is_active,
    };
  }

  async createAssignment(
    input: CreateAssignmentInput,
  ): Promise<OrganizationalAssignment> {
    const response = await this.client
      .from("organizational_assignments")
      .insert({
        profile_id: input.profileId,
        company_id: input.companyId,
        organizational_unit_id: input.organizationalUnitId ?? null,
        role_id: input.roleId,
        title: input.title ?? null,
        unit_scope_mode: input.unitScopeMode,
        restaurant_scope_mode: input.restaurantScopeMode,
        valid_from: input.validFrom,
        valid_to: input.validTo ?? null,
      })
      .select(
        "id, profile_id, company_id, organizational_unit_id, role_id, title, unit_scope_mode, restaurant_scope_mode, valid_from, valid_to, is_active",
      )
      .single();
    if (response.error !== null) fail(response.error);
    return this.mapAssignment(assignmentRow.parse(response.data));
  }

  async createHierarchyRelationship(
    input: CreateHierarchyRelationshipInput,
  ): Promise<HierarchyRelationship> {
    const response = await this.client
      .from("hierarchy_relationships")
      .insert({
        parent_assignment_id: input.parentAssignmentId,
        child_assignment_id: input.childAssignmentId,
        relationship_type: input.relationshipType,
        valid_from: input.validFrom,
        valid_to: input.validTo ?? null,
      })
      .select(
        "id, parent_assignment_id, child_assignment_id, relationship_type, valid_from, valid_to, is_active",
      )
      .single();
    if (response.error !== null) fail(response.error);
    const row = hierarchyRow.parse(response.data);
    return {
      id: row.id,
      parentAssignmentId:
        row.parent_assignment_id as OrganizationalAssignmentId,
      childAssignmentId: row.child_assignment_id as OrganizationalAssignmentId,
      relationshipType: row.relationship_type,
      validFrom: row.valid_from,
      validTo: row.valid_to,
      isActive: row.is_active,
    };
  }

  async createRestaurantAssignment(
    input: CreateRestaurantAssignmentInput,
  ): Promise<RestaurantAssignment> {
    const response = await this.client
      .from("restaurant_assignments")
      .insert({
        organizational_assignment_id: input.organizationalAssignmentId,
        restaurant_id: input.restaurantId,
        responsibility_type: input.responsibilityType,
        valid_from: input.validFrom,
        valid_to: input.validTo ?? null,
      })
      .select(
        "id, organizational_assignment_id, restaurant_id, responsibility_type, valid_from, valid_to, is_active",
      )
      .single();
    if (response.error !== null) fail(response.error);
    const row = restaurantAssignmentRow.parse(response.data);
    return {
      id: row.id,
      organizationalAssignmentId:
        row.organizational_assignment_id as OrganizationalAssignmentId,
      restaurantId: row.restaurant_id as RestaurantId,
      responsibilityType: row.responsibility_type,
      validFrom: row.valid_from,
      validTo: row.valid_to,
      isActive: row.is_active,
    };
  }

  async getAssignment(id: string): Promise<OrganizationalAssignment | null> {
    const response = await this.client
      .from("organizational_assignments")
      .select(
        "id, profile_id, company_id, organizational_unit_id, role_id, title, unit_scope_mode, restaurant_scope_mode, valid_from, valid_to, is_active",
      )
      .eq("id", id)
      .maybeSingle();
    if (response.error !== null) fail(response.error);
    return response.data === null
      ? null
      : this.mapAssignment(assignmentRow.parse(response.data));
  }

  async hasHierarchyPath(
    fromAssignmentId: string,
    toAssignmentId: string,
  ): Promise<boolean> {
    const response = await this.client.rpc("has_active_hierarchy_path", {
      from_assignment_id: fromAssignmentId,
      to_assignment_id: toAssignmentId,
    });
    if (response.error !== null) fail(response.error);
    return z.boolean().parse(response.data);
  }

  async getRestaurant(id: string): Promise<Restaurant | null> {
    const response = await this.client
      .from("restaurants")
      .select("id, company_id, code, name, timezone, is_active")
      .eq("id", id)
      .maybeSingle();
    if (response.error !== null) fail(response.error);
    return response.data === null
      ? null
      : this.mapRestaurant(restaurantRow.parse(response.data));
  }

  async getOrganizationalUnit(id: string): Promise<OrganizationalUnit | null> {
    const response = await this.client
      .from("organizational_units")
      .select("id, company_id, unit_type, code, name, is_active")
      .eq("id", id)
      .maybeSingle();
    if (response.error !== null) fail(response.error);
    return response.data === null
      ? null
      : this.mapUnit(unitRow.parse(response.data));
  }

  private mapUnit(row: z.infer<typeof unitRow>): OrganizationalUnit {
    return {
      id: row.id as OrganizationalUnitId,
      companyId: row.company_id as CompanyId,
      type: row.unit_type,
      code: row.code,
      name: row.name,
      isActive: row.is_active,
    };
  }

  private mapRestaurant(row: z.infer<typeof restaurantRow>): Restaurant {
    return {
      id: row.id as RestaurantId,
      companyId: row.company_id as CompanyId,
      code: row.code,
      name: row.name,
      timezone: row.timezone,
      isActive: row.is_active,
    };
  }

  private mapAssignment(
    row: z.infer<typeof assignmentRow>,
  ): OrganizationalAssignment {
    return {
      id: row.id as OrganizationalAssignmentId,
      profileId: row.profile_id as ProfileId,
      companyId: row.company_id as CompanyId,
      organizationalUnitId:
        row.organizational_unit_id as OrganizationalUnitId | null,
      roleId: row.role_id,
      title: row.title,
      unitScopeMode: row.unit_scope_mode,
      restaurantScopeMode: row.restaurant_scope_mode,
      validFrom: row.valid_from,
      validTo: row.valid_to,
      isActive: row.is_active,
    };
  }
}
