/* This file was generated by the ServiceGenerator.
 * The ServiceGenerator is Copyright (c) 2016 Google Inc.
 */

//
//  GTLObservedtimesRowTimePackageCrewList.h
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
//   GTLObservedtimesRowTimePackageCrewList (0 custom class methods, 2 custom properties)

#if GTL_BUILT_AS_FRAMEWORK
  #import "GTL/GTLObject.h"
#else
  #import "GTLObject.h"
#endif

@class GTLObservedtimesRowTimePackageCrew;

// ----------------------------------------------------------------------------
//
//   GTLObservedtimesRowTimePackageCrewList
//

@interface GTLObservedtimesRowTimePackageCrewList : GTLObject

// used to store the crew information
@property (nonatomic, retain) NSArray *crews;  // of GTLObservedtimesRowTimePackageCrew

@property (nonatomic, copy) NSString *eventId;
@end