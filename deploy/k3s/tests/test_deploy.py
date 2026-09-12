import contextlib
import importlib.util
import io
import json
import pathlib
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('portfolio_deploy', pathlib.Path(__file__).parents[1] / 'deploy.py')
deploy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(deploy)

class DeploymentTests(unittest.TestCase):
    def exercise(self, failure=None):
        calls=[]
        revision='a'*40
        digest='sha256:'+'b'*64
        previous='ghcr.io/xdkaine/portfolio-landing@sha256:'+'c'*64
        def run(*args, **kwargs):
            calls.append(args)
            if failure=='dump' and args[0]=='exec':
                raise subprocess.CalledProcessError(1,args)
            if failure=='migration' and args[0]=='wait':
                raise subprocess.CalledProcessError(1,args)
        def get(*args):
            if args[1]=='deployment':
                return json.dumps({'spec':{'template':{'spec':{'containers':[{'image':previous}]}}}}).encode()
            return json.dumps({'spec':{'clusterIP':'10.43.1.1'}}).encode()
        def urlopen(req,**kwargs):
            url=req if isinstance(req,str) else req.full_url
            if url.endswith('turnstile'):body={'required':True,'siteKey':'public-key'}
            else:body={'status':'ok','revision':'wrong' if failure=='health' else revision}
            return io.BytesIO(json.dumps(body).encode())
        realpath=pathlib.Path
        with tempfile.TemporaryDirectory() as tmp:
            def mappedpath(value):
                return realpath(tmp) if value=='/var/backups/portfolio-deploy' else realpath(value)
            with contextlib.ExitStack() as stack:
                stack.enter_context(patch.object(sys,'argv',['deploy',digest,digest,revision]))
                stack.enter_context(patch.object(deploy,'run',side_effect=run))
                stack.enter_context(patch.object(deploy,'get',side_effect=get))
                stack.enter_context(patch.object(deploy.urllib.request,'urlopen',side_effect=urlopen))
                stack.enter_context(patch.object(deploy.pathlib,'Path',side_effect=mappedpath))
                stack.enter_context(patch('builtins.open',return_value=open(realpath(tmp)/'lock','w')))
                if failure:
                    with self.assertRaises((RuntimeError,subprocess.CalledProcessError)):deploy.main()
                else:deploy.main()
        return calls,previous

    def test_rejects_mutable_foreign_and_injected_images(self):
        for value in ['latest','ghcr.io/other/app:main','sha256:'+'a'*64+';id','sha256:abc','a'*64]:
            with self.subTest(value=value), self.assertRaises(ValueError):deploy.image(value)

    def test_failed_backup_never_migrates_or_changes_app(self):
        calls,_=self.exercise('dump')
        self.assertFalse(any(c[0] in ('create','set') for c in calls))

    def test_failed_migration_never_changes_app(self):
        calls,_=self.exercise('migration')
        self.assertFalse(any(c[0]=='set' for c in calls))

    def test_wrong_public_revision_restores_previous_image(self):
        calls,previous=self.exercise('health')
        changes=[c for c in calls if c[0]=='set']
        self.assertEqual(len(changes),2)
        self.assertEqual(changes[-1][-1],'app='+previous)

    def test_success_deploys_once_after_backup_and_migration(self):
        calls,_=self.exercise()
        self.assertEqual(sum(c[0]=='set' for c in calls),1)
        self.assertLess(next(i for i,c in enumerate(calls) if c[0]=='wait'),next(i for i,c in enumerate(calls) if c[0]=='set'))

if __name__=='__main__':unittest.main()
