> This project is in the early design and experimental phase. Standard capabilities will continue to be refined and supported.

Dubbo Inherent Mesh is an SDK-native service mesh model introduced in 2025. The control plane sends xDS policy directly to gRPC services, while service-to-service traffic keeps the direct data path.

The Dubbo agent initializes communication with the control plane. The agent does not receive application traffic as a data-plane proxy; it retrieves and rotates the certificates used by data-plane traffic.

## Quick Start
Go to the Dubbo release page, download the installation package for your operating system, and get the latest version for Linux or macOS:

```bash
curl -L https://dubbo.apache.org/downloadDubbo | sh -
```

Go to the Dubbo package directory:

```bash
cd dubbo-0.3.6
```

Install Dubbo with the default profile:

```bash
dubboctl install --set profile=default
```
