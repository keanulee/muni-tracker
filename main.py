import webapp2
import urllib2
import time
import json
from wsgiref.handlers import format_date_time

def formatValue(x):
  return {
    'arrayValue': {
      'values': [
        { 'stringValue': x['routeTag'] },
        { 'geoPointValue': {
          'latitude': x['lat'],
          'longitude': x['lon'],
        } },
        { 'integerValue': int(x['heading']) },
        { 'doubleValue': float(x['speedKmHr']) },
        { 'booleanValue': x['predictable'] == 'true' },
        { 'integerValue': int(x['secsSinceReport']) },
        { 'stringValue': x['dirTag'] if 'dirTag' in x else '' },
        { 'stringValue': x['leadingVehicleId'] if 'leadingVehicleId' in x else '' }
      ]
    }
  }

def flattenValue(x):
  if 'mapValue' in x:
    return {k: flattenValue(v) for k, v in x['mapValue']['fields'].items()}
  if 'arrayValue' in x:
    return map(flattenValue, x['arrayValue']['values'])
  if 'geoPointValue' in x:
    return [x['geoPointValue']['latitude'], x['geoPointValue']['longitude']]
  if 'stringValue' in x:
    return x['stringValue']
  if 'integerValue' in x:
    return int(x['integerValue'])
  if 'doubleValue' in x:
    return x['doubleValue']
  if 'booleanValue' in x:
    return x['booleanValue']

def flattenDocument(doc):
  return flattenValue({ 'mapValue': doc })

class FetchHandler(webapp2.RequestHandler):
  def get(self):
    now = int(time.time())
    url = 'http://webservices.nextbus.com/service/publicJSONFeed?command=vehicleLocations&a=sf-muni'
    result = urllib2.urlopen(url)
    data = json.loads(result.read())
    trains = filter(lambda x: x['routeTag'] in ['J', 'KJ', 'KT', 'L', 'LK', 'M', 'N', 'S', 'T', 'TM', 'JBUS', 'KBUS', 'LBUS', 'MBUS', 'NBUS', 'SBUS', 'TBUS'], data['vehicle'])
    body = json.dumps({
      'fields': {
        'd':  { 'integerValue': now },
        't': {
          'mapValue': {
            'fields': {v['id']: formatValue(v) for i, v in enumerate(trains)}
          }
        }
      }
    }, separators=(',', ':'))

    req = urllib2.Request('https://firestore.googleapis.com/v1beta1/projects/sfmuni-tracker/databases/(default)/documents/t?documentId=%d' % now)
    req.add_header('Content-Type', 'application/json')
    urllib2.urlopen(req, body)

    req = urllib2.Request('https://firestore.googleapis.com/v1beta1/projects/go-dashboard-2ff4e/databases/(default)/documents/t?documentId=%d' % now)
    req.add_header('Content-Type', 'application/json')
    urllib2.urlopen(req, body)

    self.response.headers['content-type'] = 'application/json'
    self.response.write(body)

class THandler(webapp2.RequestHandler):
  def get(self):
    url = 'https://firestore.googleapis.com/v1beta1/projects/go-dashboard-2ff4e/databases/(default)/documents/t?%s' % self.request.query_string
    result = urllib2.urlopen(url)
    data = json.loads(result.read())
    data['documents'] = map(flattenDocument, data['documents'])
    expires = data['documents'][0]['d'] + 60
    self.response.headers['access-control-allow-origin'] = 'https://keanulee.github.io'
    self.response.headers['cache-control'] = 'public'
    self.response.headers['expires'] = format_date_time(expires)
    self.response.headers['content-type'] = 'application/json'
    self.response.write(json.dumps(data, separators=(',', ':')))

app = webapp2.WSGIApplication([
  ('/fetch', FetchHandler),
  ('/t', THandler),
], debug=True)
