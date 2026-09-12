import copy
import hashlib
import importlib.util
import json
import pathlib
import subprocess
import unittest

spec=importlib.util.spec_from_file_location('portfolio_pull',pathlib.Path(__file__).parents[1]/'pull.py')
pull=importlib.util.module_from_spec(spec)
spec.loader.exec_module(pull)

class PullTests(unittest.TestCase):
    def setUp(self):
        self.manifest={'schema':1,'repository':pull.REPOSITORY,'revision':'a'*40,'runId':123,'runAttempt':1,'appDigest':'sha256:'+'b'*64,'migrationDigest':'sha256:'+'c'*64}
        self.raw=json.dumps(self.manifest).encode()
        self.release={'tag_name':'production-'+'a'*40+'-123-1','author':{'login':'github-actions[bot]'},'draft':False,'prerelease':False}
        self.asset={'browser_download_url':'https://github.com/'+pull.REPOSITORY+'/releases/download/'+self.release['tag_name']+'/release.json','digest':'sha256:'+hashlib.sha256(self.raw).hexdigest()}

    def test_accepts_the_checksum_bound_ci_release(self):
        self.assertEqual(pull.validate(self.release,self.asset,self.raw),self.manifest)

    def test_rejects_wrong_checksum_author_origin_and_release_type(self):
        variants=[({'draft':True},{}),({'prerelease':True},{}),({'author':{'login':'other'}},{}),({}, {'browser_download_url':'https://other.example/release.json'}),({}, {'digest':'sha256:'+'0'*64})]
        for release_patch,asset_patch in variants:
            with self.subTest(release_patch=release_patch,asset_patch=asset_patch),self.assertRaises(ValueError):
                pull.validate({**self.release,**release_patch},{**self.asset,**asset_patch},self.raw)

    def test_rejects_mutable_images_and_revision_mismatch(self):
        for patch in [{'appDigest':'latest'},{'migrationDigest':'sha256:abc'},{'revision':'d'*40},{'repository':'another/repo'}]:
            raw=json.dumps({**self.manifest,**patch}).encode()
            asset={**self.asset,'digest':'sha256:'+hashlib.sha256(raw).hexdigest()}
            with self.subTest(patch=patch),self.assertRaises(ValueError):pull.validate(self.release,asset,raw)

    def test_success_records_applied_and_repeat_does_not_deploy(self):
        calls=[];states=[]
        pull.reconcile(5,self.manifest,{},deploy=lambda *a,**k:calls.append(a),persist=lambda s:states.append(copy.deepcopy(s)))
        self.assertEqual([s['status'] for s in states],['applying','applied'])
        pull.reconcile(5,self.manifest,states[-1],deploy=lambda *a,**k:calls.append(a),persist=states.append)
        self.assertEqual(len(calls),1)

    def test_failed_deployment_requires_explicit_retry(self):
        states=[]
        def fail(*args,**kwargs):raise subprocess.CalledProcessError(1,'deploy')
        with self.assertRaises(subprocess.CalledProcessError):pull.reconcile(5,self.manifest,{},deploy=fail,persist=lambda s:states.append(copy.deepcopy(s)))
        self.assertEqual(states[-1]['status'],'failed')
        with self.assertRaises(RuntimeError):pull.reconcile(5,self.manifest,states[-1],deploy=fail,persist=states.append)
        pull.reconcile(5,self.manifest,states[-1],retry=True,deploy=lambda *a,**k:None,persist=states.append)
        self.assertEqual(states[-1]['status'],'applied')

    def test_interrupted_changed_and_older_releases_are_not_reapplied(self):
        state={'releaseId':5,'manifest':self.manifest,'status':'applying'}
        with self.assertRaises(RuntimeError):pull.reconcile(5,self.manifest,state)
        with self.assertRaises(ValueError):pull.reconcile(4,self.manifest,state)
        with self.assertRaises(ValueError):pull.reconcile(5,{**self.manifest,'runAttempt':2},state)

if __name__=='__main__':unittest.main()
