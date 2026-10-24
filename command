git add action.yml
git commit -m "feat: publish action"
git push origin main

git tag -a v1.0.0 -m "v1.0.0"
git tag -fa v1 -m "v1"
git push origin v1.0.0
git push origin v1 --force