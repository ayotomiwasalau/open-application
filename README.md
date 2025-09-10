# Open application

THe repo containing open vibecoded games

kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
kubectl port-forward -n dev svc/argocd-server-nodeport  --address 0.0.0.0 30008:30008
kubectl port-forward -n dev svc/tommy-jumper-server  --address 0.0.0.0 3112:3112

kubectl -n dev create secret generic db-secret \
  --from-literal=DB_PASSWORD='password \
  --dry-run=client -o yaml \
| kubeseal -n dev -o yaml > helm/sealed-db-secret.yaml

kuctl -n dev exec -it statefulset/app-db -- psql -U postgres -d postgres -c "\du"

kubectl -n dev exec -i statefulset/app-db -- psql -U postgres -d postgres -f - < /1_create_table.sql
#TODO
optimze applicaiton build for dev and prod
add login args during build time
