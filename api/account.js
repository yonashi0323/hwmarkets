import {createAccountHandler} from '../lib/accounts.js';
let client;
async function getClient(){
  if(!client){const {default:DescopeClient}=await import('@descope/node-sdk');client=DescopeClient({projectId:process.env.DESCOPE_PROJECT_ID,managementKey:process.env.DESCOPE_MANAGEMENT_KEY||undefined,fetch:(url,options={})=>fetch(url,{...options,signal:options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(8000)]):AbortSignal.timeout(8000)})});}
  return client;
}
export default createAccountHandler({getClient});