from qgis.core import *
from qgis import processing
from qgis.analysis import QgsNativeAlgorithms
from Scripts/AlgorithmProvider import AlgorithmProvider



# Supply path to qgis install location
path = r"D:\Program Files\QGIS 3.34.2\apps\qgis"
QgsApplication.setPrefixPath(path, True)

import sys
sys.path.append(r"D:\Program Files\QGIS 3.34.2\apps\qgis\python\plugins")
import processing
from processing.core.Processing import Processing
Processing.initialize()

# Create a reference to the QgsApplication.  Setting the
# second argument to False disables the GUI.
qgs = QgsApplication([], False)

# Load providers
qgs.initQgis()

project = QgsProject.instance()
project.read('D:\Projects\Mapping Projects\TransitIsochrone\TransitConnectivity.qgz')

Processing.initialize()
provider = AlgorithmProvider()
QgsApplication.processingRegistry().addProvider(provider)
#QgsApplication.processingRegistry().addProvider(QgsNativeAlgorithms())
#
#
processing.run("alg_provider:transitservicearea", {'STARTLOCATION':'7642700.835310,682883.097856 [EPSG:2913]','SEARCHTIMELIMIT':15})
#
#
# # Finally, exitQgis() is called to remove the
# # provider and layer registries from memory
qgs.exitQgis()