import * as vscode from 'vscode';

export enum MemberRole {
    OWNER = 'owner',
    ADMIN = 'admin',
    MEMBER = 'member',
    VIEWER = 'viewer'
}

export enum InvitationStatus {
    PENDING = 'pending',
    ACCEPTED = 'accepted',
    DECLINED = 'declined',
    EXPIRED = 'expired'
}

export interface Organization {
    id: string;
    name: string;
    description: string;
    createdAt: number;
    ownerId: string;
    memberCount: number;
    plan: 'free' | 'pro' | 'enterprise';
    settings: OrganizationSettings;
}

export interface OrganizationSettings {
    allowMemberInvites: boolean;
    requireApproval: boolean;
    maxMembers: number;
    sharedResources: {
        prompts: boolean;
        modes: boolean;
        checkpoints: boolean;
        settings: boolean;
    };
}

export interface Member {
    id: string;
    userId: string;
    organizationId: string;
    role: MemberRole;
    email: string;
    name: string;
    avatar?: string;
    joinedAt: number;
    lastActive?: number;
}

export interface Invitation {
    id: string;
    organizationId: string;
    email: string;
    role: MemberRole;
    invitedBy: string;
    status: InvitationStatus;
    createdAt: number;
    expiresAt: number;
    acceptedAt?: number;
}

export interface Team {
    id: string;
    organizationId: string;
    name: string;
    description: string;
    members: string[]; // Member IDs
    createdAt: number;
    createdBy: string;
}

export interface SharedWorkspace {
    id: string;
    organizationId: string;
    name: string;
    description: string;
    path: string;
    ownerId: string;
    teamId?: string;
    members: string[]; // Member IDs with access
    createdAt: number;
    lastModified: number;
}

export class OrganizationManager {
    private static instance: OrganizationManager;
    private currentUser: { id: string; email: string; name: string } | null;
    private organizations: Map<string, Organization>;
    private currentOrganization: string | null;
    private members: Map<string, Member[]>; // organizationId -> members
    private invitations: Map<string, Invitation[]>; // organizationId -> invitations
    private teams: Map<string, Team[]>; // organizationId -> teams
    private workspaces: Map<string, SharedWorkspace[]>; // organizationId -> workspaces
    private apiEndpoint: string;
    private apiKey: string;

    private constructor() {
        this.currentUser = null;
        this.organizations = new Map();
        this.currentOrganization = null;
        this.members = new Map();
        this.invitations = new Map();
        this.teams = new Map();
        this.workspaces = new Map();
        this.apiEndpoint = '';
        this.apiKey = '';
    }

    public static getInstance(): OrganizationManager {
        if (!OrganizationManager.instance) {
            OrganizationManager.instance = new OrganizationManager();
        }
        return OrganizationManager.instance;
    }

    public async initialize(apiEndpoint: string, apiKey: string): Promise<void> {
        this.apiEndpoint = apiEndpoint;
        this.apiKey = apiKey;

        // Load current user
        await this.loadCurrentUser();

        // Load organizations
        if (this.currentUser) {
            await this.loadOrganizations();
        }
    }

    private async loadCurrentUser(): Promise<void> {
        try {
            const response = await this.makeRequest('GET', '/user/me');
            if (response.ok) {
                this.currentUser = await response.json();
            }
        } catch (error) {
            console.error('Failed to load current user:', error);
        }
    }

    public getCurrentUser(): { id: string; email: string; name: string } | null {
        return this.currentUser;
    }

    private async loadOrganizations(): Promise<void> {
        try {
            const response = await this.makeRequest('GET', '/organizations');
            if (response.ok) {
                const orgs: Organization[] = await response.json();
                orgs.forEach(org => this.organizations.set(org.id, org));
            }
        } catch (error) {
            console.error('Failed to load organizations:', error);
        }
    }

    public getOrganizations(): Organization[] {
        return Array.from(this.organizations.values());
    }

    public getCurrentOrganization(): Organization | null {
        if (!this.currentOrganization) {
            return null;
        }
        return this.organizations.get(this.currentOrganization) || null;
    }

    public async setCurrentOrganization(organizationId: string): Promise<void> {
        if (!this.organizations.has(organizationId)) {
            throw new Error('Organization not found');
        }

        this.currentOrganization = organizationId;

        // Load organization-specific data
        await this.loadMembers(organizationId);
        await this.loadInvitations(organizationId);
        await this.loadTeams(organizationId);
        await this.loadWorkspaces(organizationId);

        // Save to workspace configuration
        const config = vscode.workspace.getConfiguration('oropendola');
        await config.update('organization.currentId', organizationId, vscode.ConfigurationTarget.Global);
    }

    public async createOrganization(name: string, description: string): Promise<Organization> {
        const newOrg: Partial<Organization> = {
            name,
            description,
            plan: 'free',
            settings: {
                allowMemberInvites: true,
                requireApproval: false,
                maxMembers: 5,
                sharedResources: {
                    prompts: true,
                    modes: true,
                    checkpoints: false,
                    settings: true
                }
            }
        };

        try {
            const response = await this.makeRequest('POST', '/organizations', newOrg);
            if (response.ok) {
                const organization: Organization = await response.json();
                this.organizations.set(organization.id, organization);
                return organization;
            } else {
                throw new Error('Failed to create organization');
            }
        } catch (error) {
            throw new Error(`Failed to create organization: ${error}`);
        }
    }

    public async updateOrganization(organizationId: string, updates: Partial<Organization>): Promise<void> {
        try {
            const response = await this.makeRequest('PATCH', `/organizations/${organizationId}`, updates);
            if (response.ok) {
                const updated: Organization = await response.json();
                this.organizations.set(organizationId, updated);
            } else {
                throw new Error('Failed to update organization');
            }
        } catch (error) {
            throw new Error(`Failed to update organization: ${error}`);
        }
    }

    public async deleteOrganization(organizationId: string): Promise<void> {
        try {
            const response = await this.makeRequest('DELETE', `/organizations/${organizationId}`);
            if (response.ok) {
                this.organizations.delete(organizationId);
                if (this.currentOrganization === organizationId) {
                    this.currentOrganization = null;
                }
            } else {
                throw new Error('Failed to delete organization');
            }
        } catch (error) {
            throw new Error(`Failed to delete organization: ${error}`);
        }
    }

    // Member Management
    private async loadMembers(organizationId: string): Promise<void> {
        try {
            const response = await this.makeRequest('GET', `/organizations/${organizationId}/members`);
            if (response.ok) {
                const members: Member[] = await response.json();
                this.members.set(organizationId, members);
            }
        } catch (error) {
            console.error('Failed to load members:', error);
        }
    }

    public getMembers(organizationId?: string): Member[] {
        const orgId = organizationId || this.currentOrganization;
        if (!orgId) return [];
        return this.members.get(orgId) || [];
    }

    public async inviteMember(email: string, role: MemberRole): Promise<Invitation> {
        if (!this.currentOrganization) {
            throw new Error('No organization selected');
        }

        const invitation: Partial<Invitation> = {
            email,
            role,
            organizationId: this.currentOrganization
        };

        try {
            const response = await this.makeRequest(
                'POST',
                `/organizations/${this.currentOrganization}/invitations`,
                invitation
            );

            if (response.ok) {
                const newInvitation: Invitation = await response.json();
                const invitations = this.invitations.get(this.currentOrganization) || [];
                invitations.push(newInvitation);
                this.invitations.set(this.currentOrganization, invitations);
                return newInvitation;
            } else {
                throw new Error('Failed to send invitation');
            }
        } catch (error) {
            throw new Error(`Failed to invite member: ${error}`);
        }
    }

    public async removeMember(memberId: string): Promise<void> {
        if (!this.currentOrganization) {
            throw new Error('No organization selected');
        }

        try {
            const response = await this.makeRequest(
                'DELETE',
                `/organizations/${this.currentOrganization}/members/${memberId}`
            );

            if (response.ok) {
                const members = this.members.get(this.currentOrganization) || [];
                const filtered = members.filter(m => m.id !== memberId);
                this.members.set(this.currentOrganization, filtered);
            } else {
                throw new Error('Failed to remove member');
            }
        } catch (error) {
            throw new Error(`Failed to remove member: ${error}`);
        }
    }

    public async updateMemberRole(memberId: string, role: MemberRole): Promise<void> {
        if (!this.currentOrganization) {
            throw new Error('No organization selected');
        }

        try {
            const response = await this.makeRequest(
                'PATCH',
                `/organizations/${this.currentOrganization}/members/${memberId}`,
                { role }
            );

            if (response.ok) {
                const members = this.members.get(this.currentOrganization) || [];
                const member = members.find(m => m.id === memberId);
                if (member) {
                    member.role = role;
                }
            } else {
                throw new Error('Failed to update member role');
            }
        } catch (error) {
            throw new Error(`Failed to update member role: ${error}`);
        }
    }

    // Invitation Management
    private async loadInvitations(organizationId: string): Promise<void> {
        try {
            const response = await this.makeRequest('GET', `/organizations/${organizationId}/invitations`);
            if (response.ok) {
                const invitations: Invitation[] = await response.json();
                this.invitations.set(organizationId, invitations);
            }
        } catch (error) {
            console.error('Failed to load invitations:', error);
        }
    }

    public getInvitations(organizationId?: string): Invitation[] {
        const orgId = organizationId || this.currentOrganization;
        if (!orgId) return [];
        return this.invitations.get(orgId) || [];
    }

    public async cancelInvitation(invitationId: string): Promise<void> {
        if (!this.currentOrganization) {
            throw new Error('No organization selected');
        }

        try {
            const response = await this.makeRequest(
                'DELETE',
                `/organizations/${this.currentOrganization}/invitations/${invitationId}`
            );

            if (response.ok) {
                const invitations = this.invitations.get(this.currentOrganization) || [];
                const filtered = invitations.filter(i => i.id !== invitationId);
                this.invitations.set(this.currentOrganization, filtered);
            }
        } catch (error) {
            throw new Error(`Failed to cancel invitation: ${error}`);
        }
    }

    // Team Management
    private async loadTeams(organizationId: string): Promise<void> {
        try {
            const response = await this.makeRequest('GET', `/organizations/${organizationId}/teams`);
            if (response.ok) {
                const teams: Team[] = await response.json();
                this.teams.set(organizationId, teams);
            }
        } catch (error) {
            console.error('Failed to load teams:', error);
        }
    }

    public getTeams(organizationId?: string): Team[] {
        const orgId = organizationId || this.currentOrganization;
        if (!orgId) return [];
        return this.teams.get(orgId) || [];
    }

    public async createTeam(name: string, description: string, memberIds: string[]): Promise<Team> {
        if (!this.currentOrganization) {
            throw new Error('No organization selected');
        }

        const newTeam: Partial<Team> = {
            name,
            description,
            members: memberIds,
            organizationId: this.currentOrganization
        };

        try {
            const response = await this.makeRequest(
                'POST',
                `/organizations/${this.currentOrganization}/teams`,
                newTeam
            );

            if (response.ok) {
                const team: Team = await response.json();
                const teams = this.teams.get(this.currentOrganization) || [];
                teams.push(team);
                this.teams.set(this.currentOrganization, teams);
                return team;
            } else {
                throw new Error('Failed to create team');
            }
        } catch (error) {
            throw new Error(`Failed to create team: ${error}`);
        }
    }

    public async deleteTeam(teamId: string): Promise<void> {
        if (!this.currentOrganization) {
            throw new Error('No organization selected');
        }

        try {
            const response = await this.makeRequest(
                'DELETE',
                `/organizations/${this.currentOrganization}/teams/${teamId}`
            );

            if (response.ok) {
                const teams = this.teams.get(this.currentOrganization) || [];
                const filtered = teams.filter(t => t.id !== teamId);
                this.teams.set(this.currentOrganization, filtered);
            }
        } catch (error) {
            throw new Error(`Failed to delete team: ${error}`);
        }
    }

    // Workspace Management
    private async loadWorkspaces(organizationId: string): Promise<void> {
        try {
            const response = await this.makeRequest('GET', `/organizations/${organizationId}/workspaces`);
            if (response.ok) {
                const workspaces: SharedWorkspace[] = await response.json();
                this.workspaces.set(organizationId, workspaces);
            }
        } catch (error) {
            console.error('Failed to load workspaces:', error);
        }
    }

    public getWorkspaces(organizationId?: string): SharedWorkspace[] {
        const orgId = organizationId || this.currentOrganization;
        if (!orgId) return [];
        return this.workspaces.get(orgId) || [];
    }

    public async createWorkspace(
        name: string,
        description: string,
        path: string,
        memberIds: string[],
        teamId?: string
    ): Promise<SharedWorkspace> {
        if (!this.currentOrganization || !this.currentUser) {
            throw new Error('No organization selected');
        }

        const newWorkspace: Partial<SharedWorkspace> = {
            name,
            description,
            path,
            members: memberIds,
            teamId,
            organizationId: this.currentOrganization,
            ownerId: this.currentUser.id
        };

        try {
            const response = await this.makeRequest(
                'POST',
                `/organizations/${this.currentOrganization}/workspaces`,
                newWorkspace
            );

            if (response.ok) {
                const workspace: SharedWorkspace = await response.json();
                const workspaces = this.workspaces.get(this.currentOrganization) || [];
                workspaces.push(workspace);
                this.workspaces.set(this.currentOrganization, workspaces);
                return workspace;
            } else {
                throw new Error('Failed to create workspace');
            }
        } catch (error) {
            throw new Error(`Failed to create workspace: ${error}`);
        }
    }

    public async deleteWorkspace(workspaceId: string): Promise<void> {
        if (!this.currentOrganization) {
            throw new Error('No organization selected');
        }

        try {
            const response = await this.makeRequest(
                'DELETE',
                `/organizations/${this.currentOrganization}/workspaces/${workspaceId}`
            );

            if (response.ok) {
                const workspaces = this.workspaces.get(this.currentOrganization) || [];
                const filtered = workspaces.filter(w => w.id !== workspaceId);
                this.workspaces.set(this.currentOrganization, filtered);
            }
        } catch (error) {
            throw new Error(`Failed to delete workspace: ${error}`);
        }
    }

    private async makeRequest(method: string, path: string, body?: any): Promise<Response> {
        const url = `${this.apiEndpoint}${path}`;
        const headers: HeadersInit = {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
        };

        const options: RequestInit = {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined
        };

        return fetch(url, options);
    }

    public getStatistics() {
        const organizations = this.organizations.size;
        const currentOrg = this.getCurrentOrganization();
        const members = currentOrg ? this.getMembers().length : 0;
        const teams = currentOrg ? this.getTeams().length : 0;
        const workspaces = currentOrg ? this.getWorkspaces().length : 0;
        const pendingInvitations = currentOrg
            ? this.getInvitations().filter(i => i.status === InvitationStatus.PENDING).length
            : 0;

        return {
            totalOrganizations: organizations,
            currentOrganization: currentOrg?.name || null,
            totalMembers: members,
            totalTeams: teams,
            totalWorkspaces: workspaces,
            pendingInvitations
        };
    }
}
