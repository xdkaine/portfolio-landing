"""Notify the fixed local consumer and wait for verified deployment."""
import json,os,time,uuid
from pathlib import Path
key=os.environ['LOCAL_CI_KEY'];branch=os.environ['GITHUB_REF_NAME'];rev=os.environ['GITHUB_SHA']
if branch not in (['main','dev'] if key=='repairte' else ['main']):raise SystemExit('Non-deployment branch: tests complete')
outbox=Path.home()/'outbox';ready=outbox/'ready.json'
assert not ready.exists(),'An earlier deployment is pending'
data=json.loads(Path('release/release.json').read_text());data['branch']=branch
request_id=uuid.uuid4().hex
temp=outbox/'ready.tmp';temp.write_text(json.dumps({'descriptor':data,'requestId':request_id}));temp.replace(ready)
status=Path('/var/lib/k3s-local-ci')/(key+'-'+branch+'.json')
for _ in range(240):
 if status.exists():
  result=json.loads(status.read_text())
  if result.get('revision')==rev and result.get('requestId')==request_id:
   assert result['status']=='applied','Local deployment needs review'
   print('Verified production revision '+rev);break
 time.sleep(5)
else:raise RuntimeError('Deployment verification timed out')
