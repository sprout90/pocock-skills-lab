# Reservation Lookup

The language for a single hotel stay retrieved by its confirmation number.

## Language

**Reservation**:
A single hotel stay for one Guest at one Property, with a Reservation Status and an arrival date strictly before its departure date.
_Avoid_: Booking, itinerary, order

**Reservation Status**:
Confirmed or cancelled. A cancelled Reservation is still a Reservation.
_Avoid_: Active, void, deleted, no-show

**Confirmation Number**:
An opaque, case-sensitive string that identifies at most one Reservation. An empty or whitespace-only string is not a Confirmation Number.
_Avoid_: Reservation number, record locator, PNR, booking code

**Guest**:
The one person a Reservation is for.
_Avoid_: Customer, traveler, occupant

**Property**:
The hotel where a Reservation takes place.
_Avoid_: Venue, site, location
