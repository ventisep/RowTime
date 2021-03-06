/* This file was generated by the ServiceGenerator.
 * The ServiceGenerator is Copyright (c) 2016 Google Inc.
 */

//
//  GTLServiceObservedtimes.h
//

// ----------------------------------------------------------------------------
// NOTE: This file is generated from Google APIs Discovery Service.
// Service:
//   observedtimes/v1
// Description:
//   ObservedTimes API v1. This API allows the GET method to get a collection of
//   observed times since the last time the user asked for a list and a POST
//   method to record new times
// Classes:
//   GTLServiceObservedtimes (0 custom class methods, 0 custom properties)

#if GTL_BUILT_AS_FRAMEWORK
  #import "GTL/GTLService.h"
#else
  #import "GTLService.h"
#endif

@interface GTLServiceObservedtimes : GTLService

// No new methods

// Clients should create a standard query with any of the class methods in
// GTLQueryObservedtimes.h. The query can the be sent with GTLService's execute
// methods,
//
//   - (GTLServiceTicket *)executeQuery:(GTLQuery *)query
//                    completionHandler:(void (^)(GTLServiceTicket *ticket,
//                                                id object, NSError *error))handler;
// or
//   - (GTLServiceTicket *)executeQuery:(GTLQuery *)query
//                             delegate:(id)delegate
//                    didFinishSelector:(SEL)finishedSelector;
//
// where finishedSelector has a signature of:
//
//   - (void)serviceTicket:(GTLServiceTicket *)ticket
//      finishedWithObject:(id)object
//                   error:(NSError *)error;
//
// The object passed to the completion handler or delegate method
// is a subclass of GTLObject, determined by the query method executed.

@end
