/* This file was generated by the ServiceGenerator.
 * The ServiceGenerator is Copyright (c) 2016 Google Inc.
 */

//
//  GTLObservedtimesRowTimePackageCrew.h
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
//   GTLObservedtimesRowTimePackageCrew (0 custom class methods, 11 custom properties)

#if GTL_BUILT_AS_FRAMEWORK
  #import "GTL/GTLObject.h"
#else
  #import "GTLObject.h"
#endif

@class GTLObservedtimesRowTimePackageStage;

// ----------------------------------------------------------------------------
//
//   GTLObservedtimesRowTimePackageCrew
//

// used to store the crew information

@interface GTLObservedtimesRowTimePackageCrew : GTLObject
@property (nonatomic, copy) NSString *category;
@property (nonatomic, retain) NSNumber *cox;  // boolValue
@property (nonatomic, copy) NSString *crewId;
@property (nonatomic, copy) NSString *crewName;
@property (nonatomic, retain) NSNumber *crewNumber;  // longLongValue
@property (nonatomic, retain) NSNumber *division;  // longLongValue
@property (nonatomic, retain) GTLDateTime *endTimeLocal;
@property (nonatomic, copy) NSString *picFile;
@property (nonatomic, retain) NSNumber *rowerCount;  // longLongValue

// used to store the stages of the specific event to put in the CrewList message
@property (nonatomic, retain) NSArray *stages;  // of GTLObservedtimesRowTimePackageStage

@property (nonatomic, retain) GTLDateTime *startTimeLocal;
@end
