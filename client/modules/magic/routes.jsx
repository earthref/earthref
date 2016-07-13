import {_} from 'lodash';
import React from 'react';
import {mount} from 'react-mounter';

import Layout from '../er/components/layout.jsx';
import Home from '../er/components/home.jsx';

import {default as magicVersions} from './configs/magic_versions.js';
import MagICDataModel from './components/data_model.jsx';
import MagICMethodCodes from './components/method_codes.jsx';
import MagICUpgradeContribution from './components/upgrade_contribution.jsx';
import MagICUploadContribution from './components/upload_contribution.jsx';
import MagICExportExcelJS from './components/export_exceljs.jsx';
import MagICExportXLSXStyle from './components/export_xlsx_style.jsx';

export default function (injectDeps, {FlowRouter}) {

  const mounter = ({content = () => null}) => (content());
  const mounterWithContext = injectDeps(mounter);

  var magicRoutes = FlowRouter.group({
    prefix: '/MagIC',
    name: 'MagIC',
    triggersEnter: [function(context, redirect) {
      console.log('running MagIC group triggers');
    }]
  });

  magicRoutes.route(`/`, {
    name: 'magicHome',
    action({}) {
      mount(mounterWithContext, {
        content: () => (
          <Layout portal="MagIC">
            <Home portal="MagIC">
              <div>
                <a className="ui button" href="/MagIC/data-model/">Data Model</a>
              </div>
            </Home>
          </Layout>
        )
      });
    }
  });
  
  magicRoutes.route(`/data-model`, {
    action() { FlowRouter.go(`/MagIC/data-models/${magicVersions.slice(-1)[0]}`); }
  });
  magicRoutes.route(`/data-models/:v`, {
    name: 'magicDataModel',
    action({v}, {q}) {
      mount(mounterWithContext, {
        content: () => (
          <Layout portal="MagIC">
            <Home portal="MagIC">
              <h3>
                Browse the current and recent MagIC Data Models:
              </h3>
              <MagICDataModel version={v} search={q}/>
            </Home>
          </Layout>
        )
      });
    }
  });

  magicRoutes.route(`/method-codes`, {
    name: 'magicMethodCodes',
    action({q}) {
      mount(mounterWithContext, {
        content: () => (
          <Layout portal="MagIC">
            <Home portal="MagIC">
              <h3>
                Browse the MagIC Method Codes:
              </h3>
              <MagICMethodCodes search={q}/>
            </Home>
          </Layout>
        )
      });
    }
  });

  magicRoutes.route(`/upgrade`, {
    name: 'magicUpgrade',
    action({}) {
      mount(mounterWithContext, {
        content: () => (
          <Layout portal="MagIC">
            <Home portal="MagIC">
              <h3>
                Upgrade an outdated MagIC contribution to the&nbsp;
                <a className="purple" href="data-model" target="_blank">latest MagIC data model version</a>:
              </h3>
              <MagICUpgradeContribution/>
            </Home>
          </Layout>
        )
      });
    }
  });

  magicRoutes.route(`/upload`, {
    name: 'magicUpload',
    action({}) {
      mount(mounterWithContext, {
        content: () => (
          <Layout portal="MagIC">
            <Home portal="MagIC">
              <h3>
                Upload data to your private workspace:
              </h3>
              <MagICUploadContribution/>
            </Home>
          </Layout>
        )
      });
    }
  });

  magicRoutes.route(`/export-xlsx-style`, {
    name: 'magicExportXLSStyle',
    action({}) {
      mount(mounterWithContext, {
        content: () => (
          <Layout portal="MagIC">
            <Home portal="MagIC">
              <h3>
                Export JSON to Excel:
              </h3>
              <MagICExportXLSXStyle/>
            </Home>
          </Layout>
        )
      });
    }
  });

  magicRoutes.route(`/export-exceljs`, {
    name: 'magicExportExcelJS',
    action({}) {
      mount(mounterWithContext, {
        content: () => (
          <Layout portal="MagIC">
            <Home portal="MagIC">
              <h3>
                Export JSON to Excel:
              </h3>
              <MagICExportExcelJS/>
            </Home>
          </Layout>
        )
      });
    }
  });

}
