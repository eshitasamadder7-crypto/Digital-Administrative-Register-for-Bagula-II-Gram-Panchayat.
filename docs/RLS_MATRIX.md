# RLS Matrix (Phase 1 - Step 8)

## Purpose
This document catalogs the active Row-Level Security (RLS) policies implemented in the backend PostgreSQL database, mapped directly from `supabase/migrations/`.

## General Security Posture
- Default deny: Most tables have RLS enabled, meaning access is denied unless explicitly granted by a policy.
- Access checks largely rely on the `public.has_role(auth.uid(), '...')` SECURITY DEFINER function to bypass recursive checks on the `user_roles` table.

## Policy Matrix

### 1. Identity & Profiles (`user_roles`, `admin_profiles`, `citizen_profiles`)
| Table | Operation | Role/User Category | Using Condition / With Check | Source Migration |
|-------|-----------|--------------------|-----------------------------|------------------|
| `user_roles` | SELECT | Authenticated | `auth.uid() = user_id` | `20260725204938` |
| `user_roles` | ALL | Super Admin | `has_role(auth.uid(),'super_admin')` | `20260725204938` |
| `admin_profiles` | SELECT | Authenticated | `auth.uid() = user_id` | `20260725204938` |
| `admin_profiles` | UPDATE | Authenticated | `auth.uid() = user_id` | `20260725204938` |
| `admin_profiles` | ALL | Super Admin | `has_role(auth.uid(),'super_admin')` | `20260725204938` |
| `admin_permissions` | SELECT | Authenticated | `auth.uid() = user_id` | `20260725204938` |
| `admin_permissions` | ALL | Super Admin | `has_role(auth.uid(),'super_admin')` | `20260725204938` |
| `citizen_profiles` | SELECT | Authenticated | `auth.uid() = user_id` | `20260802035700` |
| `citizen_profiles` | UPDATE | Authenticated | `auth.uid() = user_id` | `20260802035700` |
| `citizen_profiles` | SELECT/UPDATE | Admin/Super Admin | `has_role(auth.uid(),'admin') OR has_role(..., 'super_admin')` | `20260802035700` |

### 2. Legacy Certificates (`warish_certificates`, `dependent_certificates`)
*(Historically defined across multiple migrations, consolidated in `20260725080927`, rewritten in `20260805020517`)*
| Table | Operation | Role/User Category | Using Condition / With Check | Enforcement Note |
|-------|-----------|--------------------|-----------------------------|------------------|
| `warish_certificates` | INSERT | DEO | `has_role(auth.uid(), 'deo') AND status = 'Draft'` | Drafts only |
| `warish_certificates` | SELECT/UPDATE | DEO | `has_role(auth.uid(), 'deo') AND created_by = auth.uid()` | Own drafts only |
| `warish_certificates` | SELECT | Admin/Super Admin | `has_role(auth.uid(), 'admin') OR has_role(..., 'super_admin')` | Active Policy (`20260805020517`) |
| `warish_certificates` | UPDATE | Admin | `has_role(auth.uid(), 'admin')` | Active Policy (`20260805020517`) |
| `dependent_certificates` | (Same as Warish) | DEO / Admin | (Same as Warish) | Active Policy (`20260805020517`) |

### 3. Dynamic Citizen Workflow (`dynamic_records`, `dynamic_applications`)
*(Defined in `20270101000000_robust_backend_architecture.sql`)*
| Table | Operation | Role/User Category | Using Condition / With Check | Enforcement Note |
|-------|-----------|--------------------|-----------------------------|------------------|
| `dynamic_records` | ALL (deny) | Public | `false` | Blocked direct client mutation |
| `dynamic_records` | SELECT | Citizen | `record_data->>'citizen_id' = auth.uid()` | RLS isolation via RPC |
| `workflow_transitions`| ALL (deny) | Public | `false` | Blocked direct client mutation |
| `certificate_artifacts`| ALL (deny) | Public | `false` | Generated via Edge Function |

### 4. Auditing & Logs (`activity_logs`, `audit_log`, `system_audit_logs`)
| Table | Operation | Role/User Category | Using Condition / With Check | Source Migration |
|-------|-----------|--------------------|-----------------------------|------------------|
| `activity_logs` | INSERT | Authenticated | `auth.uid() = actor_user_id` | `20260725204938` |
| `activity_logs` | SELECT | Admin/Super Admin | `has_role(auth.uid(), 'super_admin')` (or explicitly via permissions) | `20260725204938` |
| `system_audit_logs` | UPDATE/DELETE | ANY | `USING (false)` | `20270101000000` (Immutable) |
| `system_audit_logs` | SELECT/INSERT | ANY | `USING (true) WITH CHECK (true)` | Inserted securely via trigger |

### 5. Content (`whats_new_entries`)
| Table | Operation | Role/User Category | Using Condition / With Check | Source Migration |
|-------|-----------|--------------------|-----------------------------|------------------|
| `whats_new_entries` | SELECT | Anon/Authenticated | `is_published = true` | `20260725204938` |
| `whats_new_entries` | ALL | Admin/Super Admin | `has_role(auth.uid(),'admin') OR has_role(..., 'super_admin')` | `20260725204938` |

## Security Observations
1. **Delegation to RPCs:** Critical updates (like changing certificate statuses to Issued, or archiving) are protected by `SECURITY DEFINER` RPCs (`approve_certificate_v2`, `execute_workflow_transition`), bypassing standard UPDATE RLS, which is a common and secure pattern for strict state machine enforcement.
2. **Immutable Audit Logs:** `system_audit_logs` strongly blocks UPDATE and DELETE.
3. **Strict Record Isolation:** `dynamic_records` is secured so heavily that the frontend must rely on backend functions or views for all mutations.
