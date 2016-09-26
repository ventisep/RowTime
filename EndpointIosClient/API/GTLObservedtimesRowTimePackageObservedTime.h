/* This file was generated by the ServiceGenerator.
 * The ServiceGenerator is Copyright (c) 2016 Google Inc.
 */

//
//  GTLObservedtimesRowTimePackageObservedTime.h
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
//   GTLObservedtimesRowTimePackageObservedTime (0 custom class methods, 7 custom properties)

#if GTL_BUILT_AS_FRAMEWORK
  #import "GTL/GTLObject.h"
#else
  #import "GTLObject.h"
#endif

// ----------------------------------------------------------------------------
//
//   GTLObservedtimesRowTimePackageObservedTime
//

// used to store an observered time from a user for a specific Crew.

@interface GTLObservedtimesRowTimePackageObservedTime : GTLObject
@property (nonatomic, retain) NSNumber *crew;  // longLongValue
@property (nonatomic, copy) NSString *eventId;
@property (nonatomic, retain) NSNumber *obsType;  // longLongValue
@property (nonatomic, retain) NSNumber *stage;  // longLongValue
@property (nonatomic, retain) GTLDateTime *time;
@property (nonatomic, copy) NSString *timeId;
@property (nonatomic, retain) GTLDateTime *timestamp;
@end