/* This file was generated by the ServiceGenerator.
 * The ServiceGenerator is Copyright (c) 2016 Google Inc.
 */

//
//  GTLQueryObservedtimes.h
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
//   GTLQueryObservedtimes (5 custom class methods, 4 custom properties)

#if GTL_BUILT_AS_FRAMEWORK
  #import "GTL/GTLQuery.h"
#else
  #import "GTLQuery.h"
#endif

@class GTLObservedtimesRowTimePackageClockSyncRequest;
@class GTLObservedtimesRowTimePackageObservedTime;

@interface GTLQueryObservedtimes : GTLQuery

//
// Parameters valid on all methods.
//

// Selector specifying which fields to include in a partial response.
@property (nonatomic, copy) NSString *fields;

//
// Method-specific parameters; see the comments below for more information.
//
@property (nonatomic, copy) NSString *eventId;
@property (nonatomic, copy) NSString *lastTimestamp;
@property (nonatomic, copy) NSString *searchString;

#pragma mark - "clock" methods
// These create a GTLQueryObservedtimes object.

// Method: observedtimes.clock.clockcheck
//  Authorization scope(s):
//   kGTLAuthScopeObservedtimesUserinfoEmail
// Fetches a GTLObservedtimesRowTimePackageClockSyncReply.
+ (instancetype)queryForClockClockcheckWithObject:(GTLObservedtimesRowTimePackageClockSyncRequest *)object;

#pragma mark - "crew" methods
// These create a GTLQueryObservedtimes object.

// Method: observedtimes.crew.list
//  Optional:
//   eventId: NSString
//  Authorization scope(s):
//   kGTLAuthScopeObservedtimesUserinfoEmail
// Fetches a GTLObservedtimesRowTimePackageCrewList.
+ (instancetype)queryForCrewList;

#pragma mark - "event" methods
// These create a GTLQueryObservedtimes object.

// Method: observedtimes.event.list
//  Optional:
//   searchString: NSString
//  Authorization scope(s):
//   kGTLAuthScopeObservedtimesUserinfoEmail
// Fetches a GTLObservedtimesRowTimePackageEventList.
+ (instancetype)queryForEventList;

#pragma mark - "times" methods
// These create a GTLQueryObservedtimes object.

// Method: observedtimes.times.listtimes
//  Optional:
//   eventId: NSString
//   lastTimestamp: NSString
//  Authorization scope(s):
//   kGTLAuthScopeObservedtimesUserinfoEmail
// Fetches a GTLObservedtimesRowTimePackageObservedTimeList.
+ (instancetype)queryForTimesListtimes;

// Method: observedtimes.times.timecreate
//  Authorization scope(s):
//   kGTLAuthScopeObservedtimesUserinfoEmail
// Fetches a GTLObservedtimesRowTimePackageObservedTime.
+ (instancetype)queryForTimesTimecreateWithObject:(GTLObservedtimesRowTimePackageObservedTime *)object;

@end