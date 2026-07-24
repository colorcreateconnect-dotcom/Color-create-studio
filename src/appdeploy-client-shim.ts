type ApiResponse<T=any>={data:T};
async function request<T=any>(method:string,url:string,data?:unknown):Promise<ApiResponse<T>>{
  const response=await fetch(url,{method,headers:data===undefined?undefined:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});
  const text=await response.text();
  let parsed:any={};
  try{parsed=text?JSON.parse(text):{}}catch{parsed={message:text}}
  if(!response.ok)throw new Error(parsed.error||parsed.message||'Request failed');
  return {data:parsed as T};
}
export const api={
  get:<T=any>(url:string,data?:unknown)=>request<T>('GET',url,data),
  post:<T=any>(url:string,data?:unknown)=>request<T>('POST',url,data),
  put:<T=any>(url:string,data?:unknown)=>request<T>('PUT',url,data),
  delete:<T=any>(url:string,data?:unknown)=>request<T>('DELETE',url,data),
};
