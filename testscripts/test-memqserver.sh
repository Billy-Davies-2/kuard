#!/bin/bash
#
# Copyright 2016 The Kubernetes Authors.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

set -o errexit
set -o nounset
set -o pipefail
set -o xtrace

HOST=http://127.0.0.1:8080
BASE=/memq/server
Q=work

set -o errexit
echo "== create queue"
curl -sf -X PUT "${HOST}${BASE}/queues?queue=${Q}"

echo "== enqueue 3"
for m in 1 2 3; do
	curl -sf -X POST "${HOST}${BASE}/queues/enqueue?queue=${Q}" -d "message ${m}" >/dev/null
done

echo "== stats after enqueue"
curl -sf "${HOST}${BASE}/stats" | jq '.queues[] | select(.name=="'"${Q}"'")'

echo "== dequeue 3"
for i in 1 2 3; do
	curl -sf -X POST "${HOST}${BASE}/queues/dequeue?queue=${Q}" || true
done

echo "== enqueue 3 again"
for m in 1 2 3; do
	curl -sf -X POST "${HOST}${BASE}/queues/enqueue?queue=${Q}" -d "again ${m}" >/dev/null
done

echo "== drain"
curl -sf -X POST "${HOST}${BASE}/queues/drain?queue=${Q}"

echo "== final stats"
curl -sf "${HOST}${BASE}/stats" | jq '.queues[] | select(.name=="'"${Q}"'")'

echo "== delete"
curl -sf -X DELETE "${HOST}${BASE}/queues?queue=${Q}"
echo "DONE"
