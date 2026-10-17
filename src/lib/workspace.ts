import {supabase} from './supabaseClient';
import {workspacePayload,type WorkspaceKind} from './workspacePayload';
export interface Workspace {id:string;name:string;owner_id:string}
export interface WorkspaceRecord {id:string;workspace_id:string;name:string;kind:WorkspaceKind;created_at:string}
export interface Revision {record_id:string;version:number;payload:Record<string,any>;own_job:boolean;created_at:string;created_by:string}
function db(){if(!supabase)throw Error('Accounts are not configured');return supabase;}
function checked<T>({data,error}:{data:T;error:any}):T{if(error)throw Error(error.message);return data;}
export async function workspaces():Promise<Workspace[]>{return checked(await db().from('dp_workspaces').select('id,name,owner_id').order('created_at'))??[];}
export async function createWorkspace(name:string){return checked(await db().from('dp_workspaces').insert({name:name.trim()}).select('id,name,owner_id').single()) as Workspace;}
export async function records(id:string):Promise<WorkspaceRecord[]>{return checked(await db().from('dp_workspace_records').select('*').eq('workspace_id',id).order('created_at',{ascending:false}).limit(200))??[];}
export async function revisions(id:string):Promise<Revision[]>{return checked(await db().from('dp_workspace_revisions').select('*').eq('record_id',id).order('version',{ascending:false}).limit(100))??[];}
export async function members(id:string){return checked(await db().from('dp_workspace_members').select('user_id,role').eq('workspace_id',id))??[];}
export async function removeMember(workspace:string,user:string){checked(await db().from('dp_workspace_members').delete().eq('workspace_id',workspace).eq('user_id',user));}
export async function saveRevision(w:string,kind:WorkspaceKind,name:string,value:unknown,own:boolean,record?:WorkspaceRecord,version=0){
 const payload=workspacePayload(kind,value);
 const id=checked(await db().rpc('dp_save_workspace_revision',{w,k:kind,n:name.trim(),p:payload,own:kind==='order'&&own,r:record?.id??null,v:version}));
 return {id,workspace_id:w,name,kind} as WorkspaceRecord;
}
export async function invite(workspace:string,role:'editor'|'viewer'){
 const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join('');
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),v=>v.toString(16).padStart(2,'0')).join('');
 checked(await db().from('dp_workspace_invites').insert({workspace_id:workspace,role,token_hash:hash}));
 return `${location.origin}/workspace#invite=${token}`;
}
export async function invites(workspace:string){return checked(await db().from('dp_workspace_invites').select('id,role,expires_at,accepted_by').eq('workspace_id',workspace))??[];}
export async function revokeInvite(id:string){checked(await db().from('dp_workspace_invites').delete().eq('id',id));}
export async function acceptInvite(token:string){return checked(await db().rpc('dp_accept_workspace_invite',{token})) as string;}
