import shutil
import os

bundle_path = r'C:\Users\PABANI\careidadmin-bundle.js'
backup_path = r'C:\Users\PABANI\careidadmin-bundle.js.phase10.bak'

if not os.path.exists(backup_path):
    shutil.copyfile(bundle_path, backup_path)
    print("Backup created at:", backup_path)
else:
    print("Backup already exists at:", backup_path)

with open(bundle_path, 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

# Target for ay()
target_ay = 'function ay(){let e=S();return et({mutationFn:async e=>{let t=`${e.firstName.trim()} ${e.lastName.trim()}`,n=new Date,r=new Intl.DateTimeFormat(`en-GB`,{day:`2-digit`,month:`short`,year:`numeric`}).format(n);return{id:`pat-${Date.now()}`,userId:`usr-${Date.now()}`,name:t,phone:e.phone,email:e.email,vaultId:`HC-CAREID-${Date.now().toString().slice(-4)}`,demographics:`${e.gender}, 30`,gender:e.gender,age:30,registered:r,registeredDate:n.toISOString().split(`T`)[0],verification:`Verified`,status:`ACTIVE`,links:{family:0,records:0},initials:t.split(` `).map(e=>e[0]).join(``).slice(0,2).toUpperCase(),avatarBg:`rgba(40,0,109,0.12)`,avatarColor:`#28006d`}},onSuccess:()=>{e.invalidateQueries({queryKey:[`patients`]})}})}'

repl_ay = 'function ay(){let e=S();return et({mutationFn:async t=>{let a=await q.post(`/api/v1/admin/patients`,{firstName:t.firstName,lastName:t.lastName,dob:t.dob,gender:t.gender,email:t.email,phone:t.phone,zipCode:t.zipCode,address:t.address,photoUrl:t.photoUrl});if(!a.success||!a.data)throw Error(a.message||a.error||`Failed to register patient.`);let n=a.data,r=`${(n.firstName||``).trim()} ${(n.lastName||``).trim()}`.trim()||`Patient`,i=new Date,o=new Intl.DateTimeFormat(`en-GB`,{day:`2-digit`,month:`short`,year:`numeric`}).format(i);return{id:n.id,userId:n.userId,name:r,phone:n.phone||t.phone,email:n.email||t.email,vaultId:n.healthCard?.cardNumber||n.patientNumber||`HC-CAREID-${Date.now().toString().slice(-4)}`,demographics:`${n.gender||t.gender}, 30`,gender:n.gender||t.gender,age:30,registered:o,registeredDate:i.toISOString().split(`T`)[0],verification:`Verified`,status:n.userStatus||`ACTIVE`,links:{family:0,records:0},initials:r.split(` `).map(e=>e[0]).join(``).slice(0,2).toUpperCase(),avatarBg:`rgba(40,0,109,0.12)`,avatarColor:`#28006d`}},onSuccess:()=>{e.invalidateQueries({queryKey:[`patients`]})}})}'

# Target for nS()
target_ns = 'nS=()=>{let e=S();return et({mutationFn:async e=>{throw Error(`Admin Medical Record Upload is not currently exposed by backend API (POST /api/v1/admin/medical-records is missing). Clinical records are ingested via Doctor Portal or Patient App.`)},onSuccess:()=>{e.invalidateQueries({queryKey:[`healthRecords`]})}})}'

repl_ns = 'nS=()=>{let e=S();return et({mutationFn:async t=>{let r=await q.post(`/api/v1/admin/medical-records`,{patientId:t.patientId||`CID-9205-1289`,category:t.category||`Medical`,recordType:t.recordType||`Diagnostic Record`,title:t.recordType||`Diagnostic Record`,provider:t.provider||`Attending Clinician`,facility:t.facility||`Metro General Hospital`,summary:t.summary||`Diagnostic clinical record uploaded via Admin portal.`});if(!r.success)throw Error(r.message||r.error||`Failed to upload medical record.`);return r.data},onSuccess:()=>{e.invalidateQueries({queryKey:[`healthRecords`]})}})}'

assert target_ay in text, "target_ay not found in bundle!"
assert target_ns in text, "target_ns not found in bundle!"

new_text = text.replace(target_ay, repl_ay).replace(target_ns, repl_ns)

with open(bundle_path, 'w', encoding='utf-8') as f:
    f.write(new_text)

print("Successfully patched careidadmin-bundle.js with real API calls for ay() and nS()!")
