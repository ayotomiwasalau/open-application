# Open application

THe repo containing open vibecoded games

kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
kubectl port-forward -n dev svc/argocd-server-nodeport  --address 0.0.0.0 30008:30008