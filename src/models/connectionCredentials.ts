'use strict';
import Constants = require('./constants');
import { ConnectionDetails } from './contracts';
import { IConnectionCredentials, AuthenticationTypes } from './interfaces';
import * as utils from './utils';
import { QuestionTypes, IQuestion, IPrompter, INameValueChoice } from '../prompts/question';

import os = require('os');

// Concrete implementation of the IConnectionCredentials interface
export class ConnectionCredentials implements IConnectionCredentials {
    public server: string;
    public database: string;
    public user: string;
    public password: string;
    public port: number;
    public authenticationType: string;
    public encrypt: boolean;
    public trustServerCertificate: boolean;
    public persistSecurityInfo: boolean;
    public connectTimeout: number;
    public connectRetryCount: number;
    public connectRetryInterval: number;
    public applicationName: string;
    public workstationId: string;
    public applicationIntent: string;
    public currentLanguage: string;
    public pooling: boolean;
    public maxPoolSize: number;
    public minPoolSize: number;
    public loadBalanceTimeout: number;
    public replication: boolean;
    public attachDbFilename: string;
    public failoverPartner: string;
    public multiSubnetFailover: boolean;
    public multipleActiveResultSets: boolean;
    public packetSize: number;
    public typeSystemVersion: string;

    /**
     * Create a connection details contract from connection credentials.
     */
    public static createConnectionDetails(credentials: IConnectionCredentials): ConnectionDetails {
        let details: ConnectionDetails = new ConnectionDetails();
        details.serverName = credentials.server;
        if (credentials.port && details.serverName.indexOf(',') === -1) {
            // Port is appended to the server name in a connection string
            details.serverName += (',' + credentials.port);
        }
        details.databaseName = credentials.database;
        details.userName = credentials.user;
        details.password = credentials.password;
        details.authenticationType = credentials.authenticationType;
        details.encrypt = credentials.encrypt;
        details.trustServerCertificate = credentials.trustServerCertificate;
        details.persistSecurityInfo = credentials.persistSecurityInfo;
        details.connectTimeout = credentials.connectTimeout;
        details.connectRetryCount = credentials.connectRetryCount;
        details.connectRetryInterval = credentials.connectRetryInterval;
        details.applicationName = credentials.applicationName;
        details.workstationId = credentials.workstationId;
        details.applicationIntent = credentials.applicationIntent;
        details.currentLanguage = credentials.currentLanguage;
        details.pooling = credentials.pooling;
        details.maxPoolSize = credentials.maxPoolSize;
        details.minPoolSize = credentials.minPoolSize;
        details.loadBalanceTimeout = credentials.loadBalanceTimeout;
        details.replication = credentials.replication;
        details.attachDbFilename = credentials.attachDbFilename;
        details.failoverPartner = credentials.failoverPartner;
        details.multiSubnetFailover = credentials.multiSubnetFailover;
        details.multipleActiveResultSets = credentials.multipleActiveResultSets;
        details.packetSize = credentials.packetSize;
        details.typeSystemVersion = credentials.typeSystemVersion;

        return details;
    }

    public static ensureRequiredPropertiesSet(
        credentials: IConnectionCredentials,
        isPasswordRequired: boolean,
        prompter: IPrompter): Promise<IConnectionCredentials> {

        let questions: IQuestion[] = ConnectionCredentials.getRequiredCredentialValuesQuestions(credentials, false, isPasswordRequired);
        return prompter.prompt(questions).then(() => credentials);
    }

    // gets a set of questions that ensure all required and core values are set
    protected static getRequiredCredentialValuesQuestions(
        credentials: IConnectionCredentials,
        promptForDbName: boolean,
        isPasswordRequired: boolean): IQuestion[] {

        let authenticationChoices: INameValueChoice[] = this.getAuthenticationTypesChoice();

        let questions: IQuestion[] = [
            // Server must be present
            {
                type: QuestionTypes.input,
                name: Constants.serverPrompt,
                message: Constants.serverPrompt,
                placeHolder: Constants.serverPlaceholder,
                shouldPrompt: (answers) => utils.isEmpty(credentials.server),
                validate: (value) => ConnectionCredentials.validateRequiredString(Constants.serverPrompt, value),
                onAnswered: (value) => credentials.server = value
            },
            // Database name is not required, prompt is optional
            {
                type: QuestionTypes.input,
                name: Constants.databasePrompt,
                message: Constants.databasePrompt,
                placeHolder: Constants.databasePlaceholder,
                shouldPrompt: (answers) => promptForDbName,
                onAnswered: (value) => credentials.database = value
            },
            {
                type: QuestionTypes.expand,
                name: Constants.authTypePrompt,
                message: Constants.authTypePrompt,
                choices: authenticationChoices,
                shouldPrompt: (answers) => utils.isEmpty(credentials.authenticationType) && authenticationChoices.length > 1,
                onAnswered: (value) => credentials.authenticationType = AuthenticationTypes[value]
            },
            // Username must be pressent
            {
                type: QuestionTypes.input,
                name: Constants.usernamePrompt,
                message: Constants.usernamePrompt,
                placeHolder: Constants.usernamePlaceholder,
                shouldPrompt: (answers) => utils.isEmpty(credentials.user),
                validate: (value) => ConnectionCredentials.validateRequiredString(Constants.usernamePrompt, value),
                onAnswered: (value) => credentials.user = value
            },
            // Password may or may not be necessary
            {
                type: QuestionTypes.password,
                name: Constants.passwordPrompt,
                message: Constants.passwordPrompt,
                placeHolder: Constants.passwordPlaceholder,
                shouldPrompt: (answers) => utils.isEmpty(credentials.password),
                validate: (value) => {
                    if (isPasswordRequired) {
                        return ConnectionCredentials.validateRequiredString(Constants.passwordPrompt, value);
                    }
                    return undefined;
                },
                onAnswered: (value) => credentials.password = value
            }
        ];
        return questions;
    }

    // Validates a string is not empty, returning undefined if true and an error message if not
    protected static validateRequiredString(property: string, value: string): string {
        if (utils.isEmpty(value)) {
            return property + Constants.msgIsRequired;
        }
        return undefined;
    }

    public static getAuthenticationTypesChoice(): INameValueChoice[] {
        let choices: INameValueChoice[] = [
            { name: Constants.authTypeSql, value: AuthenticationTypes.SqlPassword }
        ];
        // In the case of win32 support integrated. For all others only SqlAuth supported
        if ('win32' === os.platform()) {
             choices.push({ name: Constants.authTypeIntegrated, value: AuthenticationTypes.Integrated });
        }
        // TODO When Azure Active Directory is supported, add this here

        return choices;
    }
}
