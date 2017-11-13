import webapp2
import urllib2
import time
import json

def formatValue(x):
  result = {
    'id': { 'stringValue': x['id'] },
    'routeTag': { 'stringValue': x['routeTag'] },
    'position': { 'geoPointValue': {
      'latitude': x['lat'],
      'longitude': x['lon'],
    } },
    'heading': { 'integerValue': int(x['heading']) },
    'speedKmHr': { 'doubleValue': float(x['speedKmHr']) },
    'predictable': { 'booleanValue': x['predictable'] == 'true' },
    'secsSinceReport': { 'integerValue': int(x['secsSinceReport']) },
  }
  if 'dirTag' in x:
    result['dirTag'] = { 'stringValue': x['dirTag'] }
  if 'leadingVehicleId' in x:
    result['leadingVehicleId'] = { 'stringValue': x['leadingVehicleId'] }
  return { 'mapValue': { 'fields': result } }

class FetchHandler(webapp2.RequestHandler):
  def get(self):
    now = time.time() * 1000
    url = 'http://webservices.nextbus.com/service/publicJSONFeed?command=vehicleLocations&a=sf-muni&t=%d' % (now - 60000)
    result = urllib2.urlopen(url)
    data = json.loads(result.read())
    trains = filter(lambda x: x['routeTag'] in ['J', 'KT', 'L', 'M', 'N'], data['vehicle'])

    req = urllib2.Request('https://firestore.googleapis.com/v1beta1/projects/go-dashboard-2ff4e/databases/(default)/documents/trains?documentId=%d' % now)
    req.add_header('Content-Type', 'application/json')

    response = urllib2.urlopen(req, json.dumps({
      'fields': {
        'time':  { 'integerValue': int(now) },
        'trains': {
          'arrayValue': {
            'values': map(formatValue, trains)
          }
        }
      }
    }))
    self.response.headers['Content-Type'] = 'application/json'   
    self.response.write(json.dumps(trains))

app = webapp2.WSGIApplication([
  ('/fetch', FetchHandler),
], debug=True)
