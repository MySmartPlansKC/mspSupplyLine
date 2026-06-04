import { Response } from 'express';
import { isPlatformRole } from '../constants/userRoles';
import {
  CreateProjectInput,
  ProjectRepository,
} from '../repositories/ProjectRepository';
import {
  getSaturnAvailableProjects,
  getSaturnProjectById,
  SaturnProjectHydration,
} from '../services/saturnProjectRegistryService';
import { AuthRequest } from '../types/auth';
import { isSaturnPoolConfigured } from '../../config/database';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  sendError,
  ServiceUnavailableError,
  UnauthorizedError,
} from '../utilities/httpErrors';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function trimString(value: unknown): string {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function parseSaturnRef(value: unknown): number | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function assertPlatformProvisioner(role: string): void {
  if (!isPlatformRole(role)) {
    throw new ForbiddenError('Platform role required for project provisioning');
  }
}

function pickGateField(body: Record<string, unknown>, key: keyof CreateProjectInput): string {
  return trimString(body[key]);
}

function hydrationToPartialInput(
  hydration: SaturnProjectHydration
): Partial<CreateProjectInput> {
  return {
    projectName: trimString(hydration.projectName),
    projectAddress: trimString(hydration.projectAddress),
    projectCity: trimString(hydration.projectCity),
    projectState: trimString(hydration.projectState),
    projectZip: trimString(hydration.projectZip),
    countryCode: trimString(hydration.countryCode) || 'US',
    fundingCompanyName: trimString(hydration.fundingCompanyName),
    projectManagerName: trimString(hydration.projectManagerName),
    projectManagerEmail: trimString(hydration.projectManagerEmail),
    projectManagerPhone: trimString(hydration.projectManagerPhone),
    mspSaturnProjectRef: hydration.mspSaturnProjectRef,
  };
}

function assertProvisioningGate(input: CreateProjectInput): void {
  const requiredStrings: Array<[string, string]> = [
    ['projectName', input.projectName],
    ['projectAddress', input.projectAddress],
    ['projectCity', input.projectCity],
    ['projectState', input.projectState],
    ['projectZip', input.projectZip],
    ['countryCode', input.countryCode],
    ['projectManagerName', input.projectManagerName],
    ['projectManagerEmail', input.projectManagerEmail],
  ];

  for (const [field, value] of requiredStrings) {
    if (!value) {
      throw new BadRequestError(`${field} is required`);
    }
  }

  if (input.countryCode.length !== 2) {
    throw new BadRequestError('countryCode must be a 2-letter ISO code');
  }

  if (!EMAIL_PATTERN.test(input.projectManagerEmail)) {
    throw new BadRequestError('projectManagerEmail must be a valid email address');
  }
}

function mergeGateInput(
  body: Record<string, unknown>,
  clientId: string,
  hydration?: Partial<CreateProjectInput>
): CreateProjectInput {
  const merged: CreateProjectInput = {
    clientId,
    projectName: pickGateField(body, 'projectName') || hydration?.projectName || '',
    projectAddress: pickGateField(body, 'projectAddress') || hydration?.projectAddress || '',
    projectCity: pickGateField(body, 'projectCity') || hydration?.projectCity || '',
    projectState: pickGateField(body, 'projectState') || hydration?.projectState || '',
    projectZip: pickGateField(body, 'projectZip') || hydration?.projectZip || '',
    countryCode:
      pickGateField(body, 'countryCode') || hydration?.countryCode || 'US',
    projectLocale: pickGateField(body, 'projectLocale') || 'en-US',
    fundingCompanyName:
      pickGateField(body, 'fundingCompanyName') || hydration?.fundingCompanyName || '',
    purchaseOrderNumber: pickGateField(body, 'purchaseOrderNumber'),
    projectManagerName:
      pickGateField(body, 'projectManagerName') || hydration?.projectManagerName || '',
    projectManagerEmail:
      pickGateField(body, 'projectManagerEmail') || hydration?.projectManagerEmail || '',
    projectManagerPhone:
      pickGateField(body, 'projectManagerPhone') || hydration?.projectManagerPhone || '',
    mspSaturnProjectRef: hydration?.mspSaturnProjectRef ?? null,
  };

  const bodySaturnRef = parseSaturnRef(body.mspSaturnProjectRef);
  if (bodySaturnRef !== null) {
    merged.mspSaturnProjectRef = bodySaturnRef;
  }

  return merged;
}

async function resolveCreateProjectInput(
  body: Record<string, unknown>,
  clientId: string
): Promise<CreateProjectInput> {
  const saturnRef = parseSaturnRef(body.mspSaturnProjectRef);
  let hydration: Partial<CreateProjectInput> | undefined;

  if (saturnRef !== null) {
    if (await ProjectRepository.isSaturnRefAssigned(saturnRef)) {
      throw new ConflictError(
        `mspSaturnProjectRef ${saturnRef} is already assigned to a SupplyLine project`
      );
    }

    const saturnProject = await getSaturnProjectById(saturnRef);
    if (!saturnProject) {
      throw new BadRequestError(`Saturn project ${saturnRef} was not found`);
    }

    hydration = hydrationToPartialInput(saturnProject);
    hydration.mspSaturnProjectRef = saturnRef;
  }

  const input = mergeGateInput(body, clientId, hydration);
  assertProvisioningGate(input);
  return input;
}

export async function getProjectsForUser(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    const projects = await ProjectRepository.listProjectsForUser(
      req.user.userId,
      req.user.role
    );

    res.json({
      projects: projects.map((project) => ProjectRepository.toProjectApiRecord(project)),
    });
  } catch (error) {
    sendError(res, error);
  }
}

export async function getSaturnAvailableProjectsHandler(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    assertPlatformProvisioner(req.user.role);

    if (!isSaturnPoolConfigured()) {
      throw new ServiceUnavailableError(
        'Saturn read pool is not configured. Set SATURN_DB_* environment variables.'
      );
    }

    const usedRefs = await ProjectRepository.listAssignedSaturnRefs();
    const saturnProjects = await getSaturnAvailableProjects(usedRefs);

    res.json({ saturnProjects });
  } catch (error) {
    sendError(res, error);
  }
}

export async function postProject(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    assertPlatformProvisioner(req.user.role);

    if (!isSaturnPoolConfigured() && req.body?.mspSaturnProjectRef !== undefined) {
      throw new ServiceUnavailableError(
        'Saturn read pool is not configured for project import'
      );
    }

    const body =
      req.body && typeof req.body === 'object' && !Array.isArray(req.body)
        ? (req.body as Record<string, unknown>)
        : {};

    if (body.clientId !== undefined) {
      throw new BadRequestError('clientId must not be supplied in the request body');
    }

    const input = await resolveCreateProjectInput(body, req.user.clientId);

    const existingProject = await ProjectRepository.findActiveProjectByNameAndCity(
      input.clientId,
      input.projectName,
      input.projectCity
    );
    if (existingProject) {
      throw new ConflictError(
        `Operation Aborted: An active project node named "${input.projectName.trim()}" is already provisioned for ${input.projectCity.trim()}.`
      );
    }

    const created = await ProjectRepository.createProjectWithAccess(
      req.user.userId,
      input
    );

    res.status(201).json({
      project: ProjectRepository.toProjectApiRecord(created),
    });
  } catch (error) {
    sendError(res, error);
  }
}

export async function getProjectContext(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user || req.projectId === undefined) {
      throw new UnauthorizedError();
    }

    res.json({
      projectId: req.projectId,
      userId: req.user.userId,
      role: req.user.role,
      access: 'granted',
    });
  } catch (error) {
    sendError(res, error);
  }
}
