# Confirmation number is the only capability

Callers are anonymous. Holding a Confirmation Number is what authorizes a lookup; there is no API key, session, or user account. Failures are counted per TCP peer address, and client-supplied forwarding headers are ignored, because those headers are spoofable and nothing trusted sits in front of this service. A shared address, such as a lobby or a corporate NAT, shares one failure budget. API keys were rejected because there is no identity provider in scope, and trusting `X-Forwarded-For` was rejected because the caller can set it.
