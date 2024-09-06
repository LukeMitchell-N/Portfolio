from qgis.PyQt.QtCore import QCoreApplication
from qgis.core import (QgsProcessing,
                       QgsProcessingAlgorithm,
                       QgsProcessingException,
                        QgsProcessingParameterNumber,
                       QgsProcessingParameterVectorDestination,
                       QgsProcessingParameterPoint,
                       QgsProcessingParameterString)
from importlib import reload
import ServiceAreaSearch
reload(ServiceAreaSearch)


class TransitServiceArea(QgsProcessingAlgorithm):

    def tr(self, string):
        return QCoreApplication.translate('Processing', string)

    def createInstance(self):
        return TransitServiceArea()

    def name(self):
        return 'transitservicearea'

    def displayName(self):
        return self.tr('Transit Service Area')


    def shortHelpString(self):
        return self.tr('Generates an accurate public transit service area for any point in the Portland metropolitan area given a time limit.')

    def initAlgorithm(self, config=None):
        self.addParameter(
            QgsProcessingParameterString(
                'STARTLOCATION',
                self.tr('Start Location'),
            )
        )

        self.addParameter(
            QgsProcessingParameterNumber(
                'SEARCHTIMELIMIT',
                self.tr('Search Time Limit (Minutes)')
            )
        )

    def processAlgorithm(self, parameters, context, feedback):
        start_location = self.parameterAsString(parameters, 'STARTLOCATION', context)
        search_time_min = self.parameterAsInt(parameters, 'SEARCHTIMELIMIT', context)

        search_time_hour = search_time_min/ 60
        name = f"Point - {search_time_min} minute service area"
        if feedback.isCanceled():
            return {}

        #print(f"Start Location: {start_location}")
        ServiceAreaSearch.main(name, start_location, search_time_hour, context, feedback)

        return {}