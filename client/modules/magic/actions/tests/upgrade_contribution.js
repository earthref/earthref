const {describe, it} = global;
import {expect} from 'chai';
import {_} from 'lodash';
import ParseContribution from '../parse_contribution.js';
import UpgradeContribution from '../upgrade_contribution.js';
import {default as contribution10507} from './files/contributions/10507.js';

describe('magic.actions.upgrade_contribution', () => {

  // Test upgrading invalid JSON.
  describe('when upgrading invalid JSON', () => {

    it('should reject when the maximum upgrade version is invalid.', () => {
      const invalidMagicVersion = {
        contribution: [{
          magic_version: '2.2'
        }]
      };
      upgradeContributionErrorTest(invalidMagicVersion, '1.0', 
        /the second argument .* is invalid/i);
    });
    
    it('should reject if the table name is invalid.', () => {
      const invalidTable = {
        contribution: [{
          magic_version: '2.5'
        }],
        not_er_locations: [{
          region: 'California'
        }]
      };
      upgradeContributionErrorTest(invalidTable, '3.0', 
        /table .* is not defined in magic data model version /i);
    });

    it('should reject if the column name is invalid.', () => {
      const invalidColumn = {
        contribution: [{
          magic_version: '2.5'
        }],
        er_locations: [{
          not_region: 'California'
        }]
      };
      upgradeContributionErrorTest(invalidColumn, '3.0',
        /column .* in table .* is not defined in magic data model/i);
    });

    it('should report one error if the same two columns are invalid.', () => {
      const invalidColumns = {
        contribution: [{
          magic_version: '2.4'
        }],
        er_locations: [{
          not_region: 'California'
        },{
          not_region: 'California'
        }]
      };
      upgradeContributionNErrorsTest(invalidColumns, '2.5', 1);
      upgradeContributionErrorTest(invalidColumns, '2.5',
        /column .* in table .* is not defined in magic data model/i);
    });
    
    it('should report two errors if two different columns are invalid.', () => {
      const invalidColumns = {
        contribution: [{
          magic_version: '2.4'
        }],
        er_locations: [{
          not_region: 'California'
        },{
          not_region2: 'California'
        }]
      };
      upgradeContributionNErrorsTest(invalidColumns, '2.5', 2);
      upgradeContributionErrorTest(invalidColumns, '2.5',
        /column .* in table .* is not defined in magic data model/i);
    });
    
  });

  // Test upgrading valid JSON.
  describe('when upgrading valid JSON', () => {

    // Numbers don't get converted from string until schema validation, so make sure they stay as strings for now.
    it('should keep numbers as strings', () => {
      const jsonOld = {
        contribution: [{
          magic_version: '2.5',
          id: '66'
        }]
      };
      const jsonNew = {
        contribution: [{
          magic_version: '3.0',
          id:'66'
        }]
      };
      upgradeContributionJSONTest(jsonOld, '3.0', jsonNew);
    });

    // Upgrading should continue from the dataset version up until the current MagIC data model version.
    // If a maximum version is passed to the upgrader, though, the upgrade should stop after the
    // dataset reaches that version.
    it('should stop upgrading at the given maximum version', () => {
      const jsonOld = {
        contribution: [{
          magic_version: '2.2'
        }]
      };
      const jsonNew = {
        contribution: [{
          magic_version: '2.4'
        }]
      };
      upgradeContributionJSONTest(jsonOld, '2.4', jsonNew);
    });

    // Tables and columns can change names from one version to the next.
    it('should update column names', () => {
      const jsonOld1 = {
        contribution: [{
          magic_version: '2.5'
        }],
        er_specimens: [{
          er_specimen_name: '1'
        }]
      };
      const jsonNew1 = {
        contribution: [{
          magic_version: '3.0'
        }],
        specimens: [{
          specimen: '1'
        }]
      };
      upgradeContributionJSONTest(jsonOld1, '3.0', jsonNew1);
      const jsonOld2 = {
        contribution: [{
          magic_version: '2.5'
        }],
        rmag_susceptibility: [{
          susceptibility_loss_tangent: '1'
        }]
      };
      const jsonNew2 = {
        contribution: [{
          magic_version: '3.0'
        }],
        specimens: [{
          susc_loss_tangent: '1'
        }]
      };
      upgradeContributionJSONTest(jsonOld2, '3.0', jsonNew2);
    });

    // Columns could be removed during an upgrade. Make sure the user will be warned about any deletions.
    it('should warn about deleted columns', () => {
      const jsonOld = {
        contribution: [{
          magic_version: '2.5'
        }],
        er_expeditions: [{
          expedition_start_loc: '1'
        }]
      };
      upgradeContributionWarningTest(jsonOld, '3.0',
        /column .* in table .* was deleted in magic data model/i);
    });

    // TODO: don't warn about some columns not being used, like er_specimens.er_location_name
    
  });

  // Tests specific to a 2.5 to 3.0 upgrade.
  // Some of the logic needed to pass these tests needs to be hard coded for the 2.5 to 3.0 upgrade case.
  // e.g. handling normalized relative intensities and geoids and creating new column types
  describe('when upgrading 2.5 to 3.0', () => {

    // Contribution level results are removed in 3.0. Make sure the user will be warned about any deletions.
    // This can happen in pmag_results or rmag_results.
    it('should warn about deleted results', () => {
      const jsonOld1 = {
        contribution: [{
          magic_version: '2.5'
        }],
        pmag_results: [{
          // These commented out columns would be empty for a contribution level result:
          //er_location_names: '',
          //er_site_names: '',
          //er_sample_names: '',
          //er_specimen_names: '',
          average_int: '1'
        }]
      };
      upgradeContributionWarningTest(jsonOld1, '3.0',
        /row .* in table .* was deleted in magic data model/i);
      const jsonOld2 = {
        contribution: [{
          magic_version: '2.5'
        }],
        rmag_results: [{
          critical_temp: '1'
        }]
      };
      upgradeContributionWarningTest(jsonOld2, '3.0',
        /row .* in table .* was deleted in magic data model/i);
    });

    // pmag_results and rmag_results in 2.5 and older tables had a loose parent/child relationship.

    // For example a pmag_results row like this, which is a result based on a combination of specimens:
    //   er_location_names   er_sites_names   er_sample_names   er_specimens_names    average_intensity
    //   Location1           Site1            Sample1           Specimen1:Specimen2   0.0000068914
    // had a parent record in the er_samples table with er_samples.er_sample_name = Sample1 because the specimens names
    // in this pmag_results row are plural and describe which of Sample1's specimens were included in the result.

    // Whereas a pmag_results row like this:
    //   er_location_names   er_sites_names   er_sample_names   er_specimens_names    average_intensity
    //   Location1           Site1            Sample1           Specimen1             0.0000052143
    //   Location1           Site1            Sample1           Specimen2             0.000005456
    // had a parent record in the er_specimens table with er_specimens.er_specimen_name = Specimen1.
    // Make sure these rows wind up in the right 3.0 tables.

    //The situation above might represent a rock(sample) split into two pieces (specimens) Each specimen was then
    //analyzed separately. The rows with a singular er_specimen_names is considered a specimen.
    // The row with the plural er_specimens_names might represent an average of the two specimens and is considered a sample.
    //GGG Use this to debug the extra 'samples' and 'specimens' problem
    it('should assign the same column into different tables based on the level', () => {
      const jsonOld = {
        contribution: [{
          magic_version: '2.5'
        }],
        pmag_results: [{ // this is a sample level result (single sample name)
          er_sample_names: '1',
          er_specimen_names: '1:3',
          average_age: '5'
        },{ // this is a specimen level result (single specimen name)
          er_sample_names: '1',
          er_specimen_names: '3',
          average_age: '6'
        }]
      };
      const jsonNew = {
        contribution: [{
          magic_version: '3.0'
        }],
        samples: [{
          sample: '1',
          specimens: '1:3',
          age: '5'
        }],
        specimens: [{
          sample: '1',
          specimen: '3',
          age: '6'
        }]
      };
      upgradeContributionJSONTest(jsonOld, '3.0', jsonNew);
    });

    //GGG Using this test for debugging because it is simple
    it('Simple Debug Test: should merge the same column value from different tables ', () => {
      const jsonOld = {
        contribution: [{
          magic_version: '2.5'
        }],
        /*er_specimens: [{
         er_specimen_name: '1'
         }],*/
        // RCJM: Yes pmag_specimens.er_specimen_names was wrong.
        // You can either use pmag_specimens.er_specimen_name or pmag_results.er_specimen_names - both merge into
        // specimens.specimen_name in 3.0.
        //pmag_specimens: [{
        pmag_specimens: [{
          er_specimen_name: '1'
        }]
      };
      const jsonNew = {
        contribution: [{
          magic_version: '3.0'
        }],
        specimens: [{
          specimen: '1'
        }]
      };
      upgradeContributionJSONTest(jsonOld, '3.0', jsonNew);
    });

    // Since many of the parent/child tables in 2.5 and earlier are joined into a single table in 3.0, make sure that
    // these two rows wind up in a single row when possible
    // (i.e. when all columns are either orthogonal or identical)
    // if, in the set of colliding columns (based on the mapping) NOT have different values, then collpase to a single row
    it('should merge the same column value from different tables', () => {
      const jsonOld1 = {
        contribution: [{
          magic_version: '2.5'
        }],
        er_specimens: [{
          er_specimen_name: 'specimen_A',
          specimen_texture: 'Metamorphic'
        }],
        pmag_results: [{
          er_specimen_names: 'specimen_A',
          data_type: 'a'
        }]
      };
      const jsonNew1 = {
        contribution: [{
          magic_version: '3.0'
        }],
        specimens: [{ // texture from er_specimens and result_type from pmag_results are orthogonal
          specimen: 'specimen_A',
          texture: 'Metamorphic',
          result_type: 'a'
        }]
      };
      upgradeContributionJSONTest(jsonOld1, '3.0', jsonNew1);
      const jsonOld2 = {
        contribution: [{
          magic_version: '2.5'
        }],
        er_sites: [{
          er_site_name: 'site_A',
          site_lat: '1.1'
        }],
        pmag_results: [{
          er_site_names: 'site_A',
          average_lat: '1.1'
        }]
      };
      const jsonNew2 = {
        contribution: [{
          magic_version: '3.0'
        }],
        sites: [{ // lat from er_sites and pmag_results are identical
          site: 'site_A',
          lat: '1.1'
        }]
      };
      upgradeContributionJSONTest(jsonOld2, '3.0', jsonNew2);
    });

    // Since many of the parent/child tables in 2.5 and earlier are joined into a single table in 3.0, make sure that
    // these two rows are kept separate with repeated information.
    //So, if any field is different, make two rows
    it('should keep different column value separate from different tables', () => {
      const jsonOld1 = {
        contribution: [{
          magic_version: '2.5'
        }],
        er_samples: [{
          er_sample_name: 'sample_A',
          sample_class: 'Submarine:Sedimentary',
          magic_method_codes: 'LP-DIR'
        }],
        pmag_results: [{///GGG Confirmed wiwth rupert that this should go to the specimen table due to no plurality
          er_sample_names: 'sample_A',
          average_int: '0.0123',
          magic_method_codes: 'LP-PI'
        }]
      };
      const jsonNew1 = {
        contribution: [{
          magic_version: '3.0'
        }],
        samples: [{ // method_codes are different, so these rows can't be combined
          sample: 'sample_A',
          geologic_classes: 'Submarine:Sedimentary',
          method_codes: 'LP-DIR'
        },{
          sample: 'sample_A',
          int_abs: '0.0123',
          method_codes: 'LP-PI'
        }]
      };
      upgradeContributionJSONTest(jsonOld1, '3.0', jsonNew1);
       const jsonOld2 = {
         contribution: [{
           magic_version: '2.5'
         }],
         er_samples: [{
           er_sample_name: 'sample_A',
           er_citation_names: 'This Study'
         }],
         pmag_results: [{
           er_sample_names: 'sample_A',
           average_int: '0.0123',
           er_citation_names: '10.1029/92JB01202'
         }]
       };
       const jsonNew2 = {
         contribution: [{
           magic_version: '3.0'
         }],
         samples: [{ // citations are different, so these rows can't be combined
           sample: 'sample_A',
           citations: 'This Study'
         },{
           sample: 'sample_A',
           average_int: '0.0123',
           citations: '10.1029/92JB01202'
         }]
       };
       upgradeContributionJSONTest(jsonOld2, '3.0', jsonNew2);
       const jsonOld3 = {
         contribution: [{
           magic_version: '2.5'
         }],
           er_sites: [{
           er_site_name: 'site_A',
           site_lat: '1.1'
         }],
         pmag_results: [{
           er_site_names: 'site_A',
           average_lat: '1.2'
         }]
       };
       const jsonNew3 = {
         contribution: [{
           magic_version: '3.0'
         }],
           sites: [{ // lat values are different, so these rows can't be combined
           site: 'site_A',
           lat: '1.1'
         },{
           site: 'site_A',
           lat: '1.2'
         }]
       };
       upgradeContributionJSONTest(jsonOld3, '3.0', jsonNew3);
    });

    // TODO: pmag_rotations into rotation_sequence matrix test

    // TODO: pmag/rmag_criteria into criteria table test

    // TODO: external_database_names/ids into a matrix test

    // TODO: normalized relative intensities test

    // TODO: different synthetic and specimen name puts synthetic name in alternatives test

    // TODO: geoid method code test

  });

  // There are currently too many console.log statements in the upgrade for this to run.
  /*
  // Test upgrading valid files.
  describe('when upgrading valid files', () => {
    it('should upgrading contribution 10507 (MagIC version 2.5) with no errors', () => {
      const Parser = new ParseContribution({});
      const json = Parser.parse(contribution10507);
      upgradeContributionNoErrorTest(json);
    });
  });*/
  
  // Test calculating the upgrade map.
  //newModel is the "more recent" of the two models involved in the upgrade process. It is the model we are upgrading the JSON object to.
  //The upgradeMap is "forward looking" from perspective of the "less recent" (or "current") model in that it shows the path from the less recent model to the "more recent".
  describe('when calculating the upgrade map', () => {
    it('should handle renamed tables', () => {
      //This represents the model we are upgrading to
      const newModel = {//indicates that table "er_locations" has been changed to "locations"
        tables: { locations: {
          columns: { location_name: {
            previous_columns: [{
              table: 'er_locations',
              column: 'location_name'
            }]
          }}
        }}
      };

      const upgradeMap = {
        er_locations: { location_name: [{ table: 'locations', column: 'location_name'}]}//the map from the old model to the new
      };

      upgradeContributionCreateMapTest(newModel, upgradeMap);
    });

    it('should handle multiple columns', () => {
      //This represents the model we are upgrading to
      const newModel = {

        'magic_version': '3.0',
        'tables': {
          'contribution': {
            'label': 'Contribution',
            'position': 1,
            'description': 'Contribution metadata',
            'columns': {
              'id': {
                'label': 'Contribution ID',
                'group': 'Contribution',
                'position': 1,
                'type': 'Integer',
                'description': 'Unique MagIC Contribution ID, Download Only, written during contribution activation',
                'examples': ['5412'],
                'validations': ['downloadOnly()'],
                'previous_columns': [{
                  'table': 'contribution',
                  'column': 'id'
                }]
              },
              'version': {
                'label': 'Version',
                'group': 'Contribution',
                'position': 2,
                'type': 'Integer',
                'description': 'Contribution version number, Download Only, written during contribution activation',
                'notes': '1 for original contribution, 6 for latest contribution if there are 6 versions, empty if the contribution is not activated',
                'validations': ['downloadOnly()'],
                'previous_columns': [{
                  'table': 'contribution',
                  'column': 'version'
                }]
              }
            }//end columns
      }}};
      const upgradeMap = {
        contribution: {
          id:     [{ table: 'contribution', column: 'id'}],
          version:[{ table: 'contribution', column: 'version'}]
        }

      };

      upgradeContributionCreateMapTest(newModel, upgradeMap);
    });

    it('should handle inserted columns', () => {
      const newModel = {
        tables: { er_locations: {
          columns: { location_name: {}}
        }}
      };
      const upgradeMap = {};
      upgradeContributionCreateMapTest(newModel, upgradeMap);
    });

    //If a the current column name is different than the previous column name on a one to one basis. By contrast, multiple columns with
    //the same previous column indicate that a split was made from the previous version
    it('should handle renamed columns', () => {
      const newModel = {//indicates that column er_locations.name has been changed  to er_locations.location_name
        tables: { er_locations: {
          columns: { location_name: {
            previous_columns: [{
              table: 'er_locations',
              column: 'name'
            }]
          }}
        }}
      };

      const upgradeMap  = {
        er_locations: { name: [{ table: 'er_locations', column: 'location_name'}]}//from the previous table and column to new table and column
      };
      upgradeContributionCreateMapTest(newModel, upgradeMap);
    });

    //If there are two columns with different names that have the same previous table and previous column name, we have a split
    it('should handle split columns', () => {
      const newModel = {
        tables: { er_locations: {
          columns: {
            location_name1: {
              previous_columns: [{
                table: 'er_locations',
                column: 'splitColName'
              }]
            },
            location_name2: {
              previous_columns: [{
                table: 'er_locations',
                column: 'splitColName'
              }]
            }
          }
        }}
      };

      const upgradeMap = {
        er_locations: {
          splitColName: [
            { table: 'er_locations', column: 'location_name1'},
            { table: 'er_locations', column: 'location_name2'}
          ]
        }
      };
      upgradeContributionCreateMapTest(newModel, upgradeMap);
    });

    it('should handle merged columns', () => {
      const newModel = {
        tables: { er_locations: {
          columns: { location_name: {
            previous_columns: [{
              table: 'er_locations',
              column: 'col_name1'
            }, {
              table: 'er_locations',
              column: 'col_name2'
            }]
          }}
        }}
      };

      const upgradeMap = {
        er_locations: {//the table in the new model
          col_name1: [{ table: 'er_locations', column: 'location_name'}],//from previous column (old JSON) TO new table and column
          col_name2: [{ table: 'er_locations', column: 'location_name'}] //from previous column (old JSON) TO new table and column
        }
      };
      upgradeContributionCreateMapTest(newModel, upgradeMap);
    });


    // TODO: write more difficult tests for table names changing,
    // merging from different tables, splitting into different tables,
    // tables with columns renamed into different tables

  });
});

// Expect the warnings to contain one warning that matches the reWarningMsg regex.
const upgradeContributionWarningTest = (jsonOld, maxVersion, reWarningMsg) => {
  const Upgrader = new UpgradeContribution({});
  Upgrader.upgrade(jsonOld, maxVersion);
  expect(Upgrader.warnings().length).to.be.at.least(1);
  expect(Upgrader.warnings()[Upgrader.warnings().length - 1]['message']).to.match(reWarningMsg);
};

// Expect the last error to match the reErrorMsg regex.
const upgradeContributionErrorTest = (jsonOld, maxVersion, reErrorMsg) => {
  const Upgrader = new UpgradeContribution({});
  Upgrader.upgrade(jsonOld, maxVersion);
  expect(Upgrader.errors().length).to.be.at.least(1);
  expect(Upgrader.errors()[Upgrader.errors().length - 1]['message']).to.match(reErrorMsg);
};

const upgradeContributionNErrorsTest = (jsonOld, maxVersion, nErrors) => {
  const Upgrader = new UpgradeContribution({});
  Upgrader.upgrade(jsonOld, maxVersion);

  //GGG CHANGING THIS because changes to the input test data are needed so that other errors are not detected
  //In this case, it is related to the requirement  that the
  //contribution table has a magic_version column, but apparently that has
  //changed. So I'll have to go and change the input data so that error
  //isn't detected by most every test
  //expect(Upgrader.errors().length).to.be.at.least(nErrors);
  expect(Upgrader.errors().length).to.equal(nErrors);
};

// Expect no errors.
const upgradeContributionNoErrorTest = (jsonOld, maxVersion) => {
  const Upgrader = new UpgradeContribution({});
  Upgrader.upgrade(jsonOld, maxVersion);
  expect(Upgrader.warnings().length).to.equal(0);
  expect(Upgrader.errors().length).to.equal(0);
};

// Expect no errors and check against expected JSON.
const upgradeContributionJSONTest = (jsonOld, maxVersion, jsonExpected) => {
  const Upgrader = new UpgradeContribution({});
  const jsonNew = Upgrader.upgrade(jsonOld, maxVersion);
  expect(Upgrader.warnings().length).to.equal(0);
  expect(Upgrader.errors().length).to.equal(0);
  expect(jsonNew).to.deep.equal(jsonExpected);
};

// Expect no errors and check the upgrade map against expected map.
const upgradeContributionCreateMapTest = (newModel, expectedMap) => {
  const Upgrader = new UpgradeContribution({});
  const upgradeMap = Upgrader._getUpgradeMap(newModel);
  expect(Upgrader.warnings().length).to.equal(0);
  expect(Upgrader.errors().length).to.equal(0);
  expect(upgradeMap).to.deep.equal(expectedMap);
};

// Expect no errors and check against expected JSON when mapping.
const upgradeContributionMapTest = (jsonOld, maxVersion, jsonExpected) => {
  const Upgrader = new UpgradeContribution({});
  const jsonNew = Upgrader._map(jsonOld, maxVersion);
  expect(Upgrader.warnings().length).to.equal(0);
  expect(Upgrader.errors().length).to.equal(0);
  expect(jsonNew).to.deep.equal(jsonExpected);
};

// Expect no errors and check against expected JSON when mapping.
const upgradeContributionReduceTest = (jsonOld, jsonExpected) => {
  const Upgrader = new UpgradeContribution({});
  const jsonNew = Upgrader._reduce(jsonOld);
  expect(Upgrader.warnings().length).to.equal(0);
  expect(Upgrader.errors().length).to.equal(0);
  expect(jsonNew).to.deep.equal(jsonExpected);
};